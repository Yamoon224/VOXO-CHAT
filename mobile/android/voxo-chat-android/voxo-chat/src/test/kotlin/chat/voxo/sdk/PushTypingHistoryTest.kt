package chat.voxo.sdk

import chat.voxo.sdk.core.VoxoApiClient
import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoConversationState
import chat.voxo.sdk.core.VoxoConversationSync
import chat.voxo.sdk.core.VoxoException
import chat.voxo.sdk.core.VoxoMemoryStore
import chat.voxo.sdk.core.VoxoPushPlatform
import chat.voxo.sdk.core.VoxoPushRegistrar
import chat.voxo.sdk.core.VoxoSessionStore
import chat.voxo.sdk.core.VoxoSocket
import chat.voxo.sdk.core.VoxoTypingSender
import chat.voxo.sdk.core.VoxoUuid
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class PushTypingHistoryTest {
    private val tenant = VoxoUuid.v4()
    private lateinit var server: MockWebServer

    @Before fun setUp() { server = MockWebServer().also { it.start() } }

    @After fun tearDown() = server.shutdown()

    private fun config(appId: String? = null) = VoxoConfig(server.url("/api").toString(), tenant, appId = appId)

    private fun ok(data: String) = MockResponse().setBody("""{"success":true,"data":$data}""")

    // --- appId

    @Test fun `the app id travels as X-App-Id and as the socket appId parameter, and only when known`() = runBlocking {
        val withId = config(appId = " com.exemple.app ")
        server.enqueue(ok("""{"status":"healthy"}"""))
        VoxoApiClient(withId).isHealthy()
        assertEquals("com.exemple.app", server.takeRequest().getHeader("X-App-Id"))
        assertTrue(withId.conversationSocketUrl("s").contains("appId=com.exemple.app"))

        val without = config()
        server.enqueue(ok("""{"status":"healthy"}"""))
        VoxoApiClient(without).isHealthy()
        assertNull(server.takeRequest().getHeader("X-App-Id"))
        assertTrue(!without.conversationSocketUrl("s").contains("appId"))
        assertNull(config(appId = "   ").appId)
    }

    // --- push

    private fun registrar(config: VoxoConfig, store: VoxoMemoryStore, session: () -> String): VoxoPushRegistrar {
        val api = VoxoApiClient(config)
        val sync = VoxoConversationSync(
            api, VoxoSocket(config, CoroutineScope(Job())), VoxoSessionStore(config, store), VoxoConversationState(), config,
        )
        return VoxoPushRegistrar(api, sync, config, session)
    }

    @Test fun `registering sends the token bound to the current session, and a new session moves it`() = runBlocking {
        var session = "s1"
        val push = registrar(config(), VoxoMemoryStore()) { session }
        server.enqueue(ok("""{"registered":true}"""))
        push.register("tok-1", VoxoPushPlatform.FCM)
        val first = server.takeRequest()
        assertEquals("/api/widget/push-token", first.path)
        assertTrue(first.body.readUtf8().let { it.contains("\"sessionId\":\"s1\"") && it.contains("\"platform\":\"fcm\"") && it.contains("\"token\":\"tok-1\"") })

        session = "s2"
        server.enqueue(ok("""{"registered":true}"""))
        push.syncSession()
        assertTrue(server.takeRequest().body.readUtf8().contains("\"sessionId\":\"s2\""))
    }

    @Test fun `a stored token is relinked after a restart`() = runBlocking {
        val store = VoxoMemoryStore()
        server.enqueue(ok("""{"registered":true}"""))
        registrar(config(), store) { "s1" }.register("tok-1", VoxoPushPlatform.APNS)
        server.takeRequest()

        val restarted = registrar(config(), store) { "s9" }
        restarted.load()
        server.enqueue(ok("""{"registered":true}"""))
        restarted.syncSession()
        assertTrue(server.takeRequest().body.readUtf8().let { it.contains("\"sessionId\":\"s9\"") && it.contains("\"platform\":\"apns\"") })
    }

    @Test fun `PUSH_NOT_ENABLED stops further attempts silently until a new token is handed over`() = runBlocking {
        val push = registrar(config(), VoxoMemoryStore()) { "s1" }
        server.enqueue(MockResponse().setResponseCode(403).setBody("""{"success":false,"error":"x","code":"PUSH_NOT_ENABLED"}"""))
        push.register("tok-1", VoxoPushPlatform.FCM) // ne lève pas
        val before = server.requestCount
        push.syncSession()
        assertEquals(before, server.requestCount)

        server.enqueue(ok("""{"registered":true}"""))
        push.register("tok-2", VoxoPushPlatform.FCM)
        assertEquals(before + 1, server.requestCount)
    }

    @Test fun `an outage never reaches the user and does not disable the feature`() = runBlocking {
        val push = registrar(config(), VoxoMemoryStore()) { "s1" }
        server.enqueue(MockResponse().setResponseCode(500).setBody("""{"success":false,"error":"Panne"}"""))
        push.register("tok-1", VoxoPushPlatform.FCM)
        server.enqueue(ok("""{"registered":true}"""))
        push.syncSession() // réessaie
        assertEquals(2, server.requestCount)
    }

    @Test fun `unregister forgets the token on the server and locally`() = runBlocking {
        val push = registrar(config(), VoxoMemoryStore()) { "s1" }
        server.enqueue(ok("""{"registered":true}"""))
        push.register("tok-1", VoxoPushPlatform.FCM)
        server.takeRequest()
        server.enqueue(ok("""{"removed":true}"""))
        push.unregister()
        val delete = server.takeRequest()
        assertEquals("DELETE", delete.method)
        assertTrue(delete.body.readUtf8().contains("\"token\":\"tok-1\""))
        val before = server.requestCount
        push.syncSession()
        assertEquals(before, server.requestCount)
    }

    // --- typing

    @OptIn(ExperimentalCoroutinesApi::class)
    private fun TestScope.sender(sent: MutableList<String>, eligible: () -> Boolean = { true }) = VoxoTypingSender(
        scope = this, clock = { currentTime }, isEligible = eligible, send = { sent += it; true },
    )

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun `typing is throttled to one frame per 200 ms and the last value always arrives`() = runTest {
        val sent = mutableListOf<String>()
        val typing = sender(sent)
        typing.submit("b")
        typing.submit("bo")
        typing.submit("bon")
        assertEquals(listOf("b"), sent)
        advanceTimeBy(199); assertEquals(listOf("b"), sent)
        advanceTimeBy(2); assertEquals(listOf("b", "bon"), sent)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun `clearing the field sends an empty frame, and never repeats an unchanged value`() = runTest {
        val sent = mutableListOf<String>()
        val typing = sender(sent)
        typing.submit("salut")
        advanceTimeBy(300)
        typing.submit("salut")
        typing.submit("")
        typing.submit("")
        assertEquals(listOf("salut", ""), sent)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun `nothing leaves the device unless typing is allowed, and text is capped at 500 characters`() = runTest {
        val sent = mutableListOf<String>()
        var allowed = false
        val typing = sender(sent) { allowed }
        typing.submit("secret")
        advanceTimeBy(1000)
        assertTrue(sent.isEmpty())

        allowed = true
        typing.submit("x".repeat(900))
        assertEquals(500, sent.single().length)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun `a frame that could not be sent is retried on the next change instead of being dropped as sent`() = runTest {
        var open = false
        val sent = mutableListOf<String>()
        val typing = VoxoTypingSender(this, { currentTime }, { true }, { if (open) { sent += it; true } else false })
        typing.submit("a")
        open = true
        advanceTimeBy(300)
        typing.submit("ab")
        assertEquals(listOf("ab"), sent)
    }

    // --- historique archivé

    @Test fun `an archived conversation is read without touching the active session`() = runBlocking {
        val config = config()
        val state = VoxoConversationState("active")
        val sync = VoxoConversationSync(
            VoxoApiClient(config), VoxoSocket(config, CoroutineScope(Job())), VoxoSessionStore(config, VoxoMemoryStore()), state, config,
        )
        server.enqueue(
            ok("""{"messages":[{"id":"m1","role":"user","content":"Bonjour"},{"id":"m2","role":"agent","content":"Salut"},{"id":"m2","role":"agent","content":"Salut"}],"handoffStatus":"human","assignedAgent":{"name":"Léa"}}"""),
        )
        val archived = sync.loadArchived("old")
        assertEquals(listOf("Bonjour", "Salut"), archived.messages.map { it.text })
        assertEquals("Léa", archived.handoff.agentName)
        assertEquals("active", state.sessionId)
        assertTrue(state.isEmpty)
        assertTrue(server.takeRequest().path!!.startsWith("/api/widget/conversation/old?limit=100"))
    }

    @Test fun `a purged archived conversation becomes History unavailable, not a technical error`() {
        val config = config()
        val sync = VoxoConversationSync(
            VoxoApiClient(config), VoxoSocket(config, CoroutineScope(Job())), VoxoSessionStore(config, VoxoMemoryStore()), VoxoConversationState(), config,
        )
        server.enqueue(MockResponse().setResponseCode(404).setBody("""{"success":false,"error":"x","code":"CONVERSATION_NOT_FOUND"}"""))
        val error = assertThrows(VoxoException::class.java) { runBlocking { sync.loadArchived("gone") } }
        assertEquals("HISTORY_UNAVAILABLE", error.code)
        assertEquals("Historique indisponible", error.message)
    }
}
