package chat.voxo.sdk

import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoEnvelope
import chat.voxo.sdk.core.VoxoException
import chat.voxo.sdk.core.VoxoFileRules
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.core.VoxoLimits
import chat.voxo.sdk.core.VoxoRateLimiter
import chat.voxo.sdk.core.VoxoUuid
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreRulesTest {
    private val tenant = VoxoUuid.v4()

    @Test fun `uuid v4 respects version and variant bits`() {
        repeat(200) { assertTrue(VoxoUuid.isValid(VoxoUuid.v4())) }
        assertFalse(VoxoUuid.isValid("not-a-uuid"))
        assertFalse(VoxoUuid.isValid("11111111-1111-1111-1111-111111111111"))
        assertFalse(VoxoUuid.isValid(null))
    }

    @Test fun `envelope returns data on success`() {
        val data = VoxoEnvelope.unwrap(200, """{"success":true,"data":{"a":1}}""")
        assertEquals("1", data["a"].toString())
    }

    @Test fun `envelope relays the server error verbatim`() {
        val error = assertThrows(VoxoException::class.java) {
            VoxoEnvelope.unwrap(429, """{"success":false,"error":"Trop vite","code":"RATE_LIMIT_EXCEEDED"}""")
        }
        assertEquals("Trop vite", error.message)
        assertTrue(error.isRateLimited)
        assertEquals(429, error.statusCode)
    }

    @Test fun `envelope falls back on unreadable failure body and keeps the status`() {
        val error = assertThrows(VoxoException::class.java) { VoxoEnvelope.unwrap(502, "<html>") }
        assertEquals(VoxoI18n.text("fr", "unavailable"), error.message)
        assertEquals(502, error.statusCode)
        val notFound = assertThrows(VoxoException::class.java) { VoxoEnvelope.unwrap(404, "") }
        assertTrue(notFound.isNotFound)
    }

    @Test fun `envelope rejects a successful but malformed body`() {
        val error = assertThrows(VoxoException::class.java) { VoxoEnvelope.unwrap(200, "oops") }
        assertEquals("MALFORMED_RESPONSE", error.code)
    }

    @Test fun `rate limiter blocks the 16th message and frees it after the window`() {
        var now = 0L
        val limiter = VoxoRateLimiter(clock = { now })
        repeat(VoxoLimits.MESSAGES_PER_MINUTE) { assertTrue(limiter.tryConsume()) }
        assertFalse(limiter.tryConsume())
        assertTrue(limiter.cooldown().inWholeSeconds > 0)
        now += 60_001
        assertTrue(limiter.tryConsume())
    }

    @Test fun `socket backoff doubles then caps at 15 seconds`() {
        val delays = (0..6).map { VoxoLimits.reconnectDelay(it).inWholeMilliseconds }
        assertEquals(listOf(1000L, 2000L, 4000L, 8000L, 15000L, 15000L, 15000L), delays)
        assertEquals(15000L, VoxoLimits.reconnectDelay(10_000).inWholeMilliseconds)
    }

    @Test fun `i18n catalogs have the same keys`() {
        assertTrue(VoxoI18n.catalogsHaveParity)
        assertEquals("Hello! How can I help you?", VoxoI18n.text("en", "defaultWelcome"))
        assertEquals("Bonjour ! Comment puis-je vous aider ?", VoxoI18n.text("de", "defaultWelcome"))
    }

    @Test fun `config normalizes the api url and builds the socket url`() {
        val config = VoxoConfig("https://api.voxo.chat/api/?x=1#f", tenant)
        assertEquals("https://api.voxo.chat/api", config.apiUrl)
        assertEquals(
            "wss://api.voxo.chat/api/widget/conversation/a%2Fb/socket?tenantId=$tenant",
            config.conversationSocketUrl("a/b"),
        )
        assertTrue(VoxoConfig("http://10.0.2.2:3000/api", tenant).conversationSocketUrl("s").startsWith("ws://10.0.2.2:3000/"))
    }

    @Test fun `config rejects a bad tenant or url`() {
        assertEquals("INVALID_CONFIG", assertThrows(VoxoException::class.java) { VoxoConfig("https://x/api", "nope") }.code)
        assertEquals("INVALID_CONFIG", assertThrows(VoxoException::class.java) { VoxoConfig("ftp://x/api", tenant) }.code)
        assertEquals("INVALID_CONFIG", assertThrows(VoxoException::class.java) { VoxoConfig("", tenant) }.code)
    }

    @Test fun `file rules mirror the shared rules`() {
        assertTrue(VoxoFileRules.validate("a.PDF", 10).isValid)
        assertNull(VoxoFileRules.validate("a.pdf", 10).error)
        assertEquals(VoxoI18n.text("fr", "fileEmpty"), VoxoFileRules.validate("a.pdf", 0).error)
        assertTrue(VoxoFileRules.validate("a.exe", 10).error!!.contains(".pdf"))
        assertTrue(VoxoFileRules.validate("a.png", VoxoFileRules.MAX_FILE_BYTES + 1).error!!.contains("10,0 Mo"))
        assertEquals("1,5 Mo", VoxoFileRules.formatSize(1_572_864))
        assertEquals("1 Ko", VoxoFileRules.formatSize(10))
        assertEquals(14, VoxoFileRules.conversationExtensions.size)
    }
}
