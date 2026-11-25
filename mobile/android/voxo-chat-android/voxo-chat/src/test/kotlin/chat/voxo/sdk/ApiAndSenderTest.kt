package chat.voxo.sdk

import chat.voxo.sdk.core.VoxoApiClient
import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoConversationState
import chat.voxo.sdk.core.VoxoException
import chat.voxo.sdk.core.VoxoMessageSender
import chat.voxo.sdk.core.VoxoRateLimiter
import chat.voxo.sdk.core.VoxoUuid
import chat.voxo.sdk.models.VoxoDeliveryStatus
import chat.voxo.sdk.models.VoxoRole
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File

class ApiAndSenderTest {
    private val tenant = VoxoUuid.v4()
    private lateinit var server: MockWebServer
    private lateinit var config: VoxoConfig
    private lateinit var api: VoxoApiClient

    @Before fun setUp() {
        server = MockWebServer().also { it.start() }
        config = VoxoConfig(server.url("/api").toString(), tenant)
        api = VoxoApiClient(config)
    }

    @After fun tearDown() = server.shutdown()

    private fun ok(data: String) = MockResponse().setBody("""{"success":true,"data":$data}""")

    @Test fun `every request carries the tenant and language headers`() = runBlocking {
        server.enqueue(ok("""{"status":"healthy"}"""))
        assertTrue(api.isHealthy())
        val request = server.takeRequest()
        assertEquals(tenant, request.getHeader("X-Tenant-ID"))
        assertEquals("fr", request.getHeader("Accept-Language"))
        assertNull(request.getHeader("Origin"))
        assertEquals("/api/widget/health", request.path)
    }

    @Test fun `upload never sets content type by hand and sends field file`() = runBlocking {
        server.enqueue(ok("""{"id":"x"}""").setResponseCode(201))
        val file = File.createTempFile("voxo", ".txt").apply { writeText("hello"); deleteOnExit() }
        api.uploadAttachment(file, "text/plain")
        val request = server.takeRequest()
        assertTrue(request.getHeader("Content-Type")!!.startsWith("multipart/form-data; boundary="))
        assertTrue(request.body.readUtf8().contains("name=\"file\""))
    }

    @Test fun `a 404 on history is surfaced as not found`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(404).setBody("""{"success":false,"error":"x","code":"NOT_FOUND"}"""))
        val error = assertThrows(VoxoException::class.java) { runBlocking { api.getConversation("s") } }
        assertTrue(error.isNotFound)
    }

    @Test fun `unreachable server maps to a network error`() {
        val dead = VoxoApiClient(VoxoConfig("http://127.0.0.1:1/api", tenant))
        val error = assertThrows(VoxoException::class.java) { runBlocking { dead.getConfig() } }
        assertEquals("NETWORK_UNAVAILABLE", error.code)
    }

    private fun sender(state: VoxoConversationState, errors: MutableList<String>, replaced: MutableList<String>) =
        VoxoMessageSender(api, config, state, VoxoRateLimiter(), {}, { errors += it }, { replaced += it }, { "user-1" })

    @Test fun `send adopts a new server session and dedupes the reply`() = runBlocking {
        val state = VoxoConversationState("old-session")
        val replaced = mutableListOf<String>()
        server.enqueue(
            ok("""{"sessionId":"new-session","response":"Salut","userMessageId":"u1","assistantMessageId":"a1","suggestions":["Oui"]}"""),
        )
        assertTrue(sender(state, mutableListOf(), replaced).send("Bonjour"))

        assertEquals("new-session", state.sessionId)
        assertEquals(listOf("old-session"), replaced)
        val (user, reply) = state.messages
        assertEquals(VoxoDeliveryStatus.ANSWERED, user.deliveryStatus)
        assertEquals("u1", user.serverId)
        assertEquals(VoxoRole.ASSISTANT, reply.role)
        assertEquals(listOf("Oui"), reply.suggestions)

        val body = server.takeRequest().body.readUtf8()
        assertTrue(body.contains("\"clientMessageId\":\"${user.id}\""))
        assertTrue(body.contains("\"sdk\":\"android\""))
        assertFalse(body.contains("attachmentIds"))
    }

    @Test fun `failed send keeps the message for retry with the same client id`() = runBlocking {
        val state = VoxoConversationState("s")
        val errors = mutableListOf<String>()
        server.enqueue(MockResponse().setResponseCode(500).setBody("""{"success":false,"error":"Panne"}"""))
        val sender = sender(state, errors, mutableListOf())
        assertFalse(sender.send("Bonjour"))

        val failed = state.lastFailed!!
        assertEquals(listOf("Panne"), errors)
        server.enqueue(ok("""{"sessionId":"s","userMessageId":"u2"}"""))
        assertTrue(sender.send(failed.text, failed.pendingAttachmentIds, retryOf = failed))
        assertEquals(1, state.messages.size)
        assertEquals(failed.id, state.messages.single().id)
        server.takeRequest()
        assertTrue(server.takeRequest().body.readUtf8().contains(failed.id))
    }

    @Test fun `local validation blocks oversized messages without a request`() = runBlocking {
        val errors = mutableListOf<String>()
        val state = VoxoConversationState()
        assertFalse(sender(state, errors, mutableListOf()).send("x".repeat(2001)))
        assertEquals(1, errors.size)
        assertEquals(0, server.requestCount)
        assertTrue(state.isEmpty)
    }
}
