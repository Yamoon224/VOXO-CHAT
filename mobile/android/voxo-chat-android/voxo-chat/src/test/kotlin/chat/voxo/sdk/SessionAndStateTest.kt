package chat.voxo.sdk

import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoConversationState
import chat.voxo.sdk.core.VoxoInactivityMonitor
import chat.voxo.sdk.core.VoxoMemoryStore
import chat.voxo.sdk.core.VoxoSessionStore
import chat.voxo.sdk.core.VoxoUuid
import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.models.VoxoDeliveryStatus
import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.VoxoHandoffStatus
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.VoxoRole
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionAndStateTest {
    private val config = VoxoConfig("https://x.test/api", VoxoUuid.v4())

    private fun json(text: String) = Json.parseToJsonElement(text).jsonObject

    @Test fun `history replacement keeps in-flight messages and the welcome only when empty`() {
        val state = VoxoConversationState()
        val welcome = state.add(VoxoMessage(role = VoxoRole.ASSISTANT, text = "Hi", isWelcome = true))
        val inFlight = state.add(VoxoMessage(role = VoxoRole.USER, text = "?", deliveryStatus = VoxoDeliveryStatus.SENDING))

        state.replaceWithHistory(emptyList())
        assertEquals(listOf(welcome.id, inFlight.id), state.messages.map { it.id })

        state.replaceWithHistory(listOf(VoxoMessage(serverId = "s1", role = VoxoRole.ASSISTANT, text = "Real")))
        assertEquals(listOf("s1", inFlight.id), state.messages.map { it.serverId ?: it.id })
    }

    @Test fun `state caps memory at 100 messages and counts only real user messages`() {
        val state = VoxoConversationState()
        repeat(120) { state.add(VoxoMessage(role = VoxoRole.USER, text = "m$it")) }
        state.add(VoxoMessage(role = VoxoRole.USER, text = "w", isWelcome = true))
        assertEquals(100, state.messages.size)
        assertEquals(120, state.messageCount)
    }

    @Test fun `a duplicated message id never reaches the UI, which uses it as a list key`() {
        val state = VoxoConversationState()
        state.replaceWithHistory(
            listOf(
                VoxoMessage(id = "ag1", serverId = "ag1", role = VoxoRole.AGENT, text = "Salut"),
                VoxoMessage(id = "ag1", serverId = "ag1", role = VoxoRole.AGENT, text = "Salut"),
                VoxoMessage(id = "ag2", serverId = "ag2", role = VoxoRole.AGENT, text = "Ça va ?"),
            ),
        )
        assertEquals(listOf("ag1", "ag2"), state.ordered.map { it.id })
    }

    @Test fun `history message parsing is tolerant and maps roles`() {
        val message = VoxoMessage.fromHistory(
            json("""{"id":"m1","role":"user","content":"yo","timestamp":"2026-01-01T10:00:00Z","feedback":"up","messageIndex":3,
                "attachments":[{"id":"a","name":"p.png","category":"image","size":5,"url":"https://s/x"}]}"""),
        )
        assertEquals(VoxoDeliveryStatus.ANSWERED, message.deliveryStatus)
        assertEquals("m1", message.serverId)
        assertEquals(3, message.messageIndex)
        assertTrue(message.attachments.single().isImage)
        assertEquals(VoxoRole.ASSISTANT, VoxoMessage.fromHistory(json("""{"role":"internal_note"}""")).role)
    }

    @Test fun `chatbot config tolerates missing optional keys`() {
        val bare = VoxoChatbotConfig.fromJson(json("{}"))
        assertNull(bare.avatarUrl)
        assertNull(bare.colorScheme)
        assertTrue(bare.showPoweredBy)
        assertEquals(3, bare.maxAttachments)

        val full = VoxoChatbotConfig.fromJson(
            json("""{"name":"Zoé","features":{"customBranding":true},"options":{"ui":{"colorScheme":"dark"},
                "features":{"attachments":false},"attachments":{"maxFiles":2,"maxBytes":1000}}}"""),
        )
        assertFalse(full.showPoweredBy)
        assertFalse(full.features.attachments)
        assertEquals("dark", full.colorScheme)
        assertEquals(1000L, full.maxAttachmentBytes)
    }

    @Test fun `handoff labels are localized`() {
        val human = VoxoHandoff.fromJson(json("""{"status":"human","assignedAgent":{"name":"Léa"}}"""))
        assertEquals(VoxoHandoffStatus.HUMAN, human.status)
        assertEquals("Vous échangez avec Léa", human.labelFor("fr"))
        assertEquals("You are chatting with Léa", human.labelFor("en"))
        assertNull(VoxoHandoff().labelFor("fr"))
    }

    @Test fun `session survives a restart and expires after 30 minutes`() = runBlocking {
        val kv = VoxoMemoryStore()
        var now = 1_000_000L
        val state = VoxoConversationState("sess")
        state.add(VoxoMessage(role = VoxoRole.USER, text = "Bonjour"))

        VoxoSessionStore(config, kv, { now }).save(state, reminderCount = 2)
        now += 5 * 60_000
        val restored = VoxoSessionStore(config, kv, { now }).restore()
        assertNotNull(restored)
        assertEquals("sess", restored!!.sessionId)
        assertEquals(2, restored.inactivityReminderCount)
        assertEquals("Bonjour", restored.messages.single().text)

        now += 31 * 60_000
        val store = VoxoSessionStore(config, kv, { now })
        assertNull(store.restore())
        assertEquals("Bonjour", store.history().single().title)
        assertNull(kv.getString("session-${config.tenantId}"))
    }

    @Test fun `archive is capped at 30 entries and dedupes by session`() = runBlocking {
        val store = VoxoSessionStore(config, VoxoMemoryStore())
        val messages = listOf(VoxoMessage(role = VoxoRole.USER, text = "t"))
        repeat(35) { store.archive("s$it", messages) }
        store.archive("s34", messages)
        val history = store.history()
        assertEquals(30, history.size)
        assertEquals("s34", history.first().sessionId)
        assertEquals(1, history.count { it.sessionId == "s34" })
    }

    @Test fun `anonymous user id is generated once and an external id wins`() = runBlocking {
        val kv = VoxoMemoryStore()
        val first = VoxoSessionStore(config, kv).userId()
        assertTrue(first.startsWith("user-"))
        assertEquals(first, VoxoSessionStore(config, kv).userId())
        val external = VoxoConfig("https://x.test/api", config.tenantId, user = chat.voxo.sdk.core.VoxoUser(externalId = "ext-9"))
        assertEquals("ext-9", VoxoSessionStore(external, kv).userId())
    }

    @Test fun `inactivity sends two reminders, then announces closing and times out`() = runBlocking {
        var now = 0L
        val events = mutableListOf<String>()
        val monitor = VoxoInactivityMonitor(
            scope = CoroutineScope(Job()),
            onReminder = { events += "reminder" },
            onClosing = { events += "closing" },
            onTimeout = { events += "timeout" },
            isActive = { true },
            clock = { now },
        )
        val step = 10 * 60_000L + 1
        repeat(3) { now += step; monitor.tick() }
        assertEquals(listOf("reminder", "reminder", "closing", "timeout"), events)
        assertEquals(3, monitor.reminderCount)
    }
}
