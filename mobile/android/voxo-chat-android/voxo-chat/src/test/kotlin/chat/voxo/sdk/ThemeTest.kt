package chat.voxo.sdk

import androidx.compose.ui.graphics.Color
import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.ui.VoxoColor
import chat.voxo.sdk.ui.VoxoDateLabels
import chat.voxo.sdk.ui.VoxoTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class ThemeTest {
    @Test fun `colors parse short, long and alpha hex and reject garbage`() {
        assertEquals(Color(0xff3b82f6.toInt()), VoxoColor.parse("#3b82f6"))
        assertEquals(Color(0xffaabbcc.toInt()), VoxoColor.parse("abc"))
        assertEquals(Color(0x80112233.toInt()), VoxoColor.parse("#80112233"))
        assertNull(VoxoColor.parse("rouge"))
        assertNull(VoxoColor.parse("#12"))
        assertNull(VoxoColor.parse(null))
    }

    @Test fun `text on a bubble stays readable on light and dark accents`() {
        assertEquals(Color(0xff111827.toInt()), VoxoColor.onColor(Color(0xfffde047.toInt())))
        assertEquals(Color.White, VoxoColor.onColor(Color(0xff1e3a8a.toInt())))
    }

    @Test fun `owner scheme wins over the system, otherwise the system decides`() {
        val none = VoxoChatbotConfig()
        assertFalse(VoxoTheme.fromConfig(none, systemDark = false).isDark)
        assertTrue(VoxoTheme.fromConfig(none, systemDark = true).isDark)
        assertTrue(VoxoTheme.fromConfig(none.copy(colorScheme = "dark"), systemDark = false).isDark)
        assertFalse(VoxoTheme.fromConfig(none.copy(colorScheme = "light"), systemDark = true).isDark)
    }

    @Test fun `an invalid accent falls back to the default blue`() {
        val theme = VoxoTheme.fromConfig(VoxoChatbotConfig(primaryColor = "n'importe quoi"))
        assertEquals(Color(0xff3b82f6.toInt()), theme.accent)
    }

    @Test fun `day separators are localized`() {
        val zone = ZoneId.of("UTC")
        val now = Instant.parse("2026-11-17T12:00:00Z")
        assertEquals("Aujourd’hui", VoxoDateLabels.daySeparator(Instant.parse("2026-11-17T01:00:00Z"), now, "fr", zone))
        assertEquals("Yesterday", VoxoDateLabels.daySeparator(Instant.parse("2026-11-16T23:00:00Z"), now, "en", zone))
        assertEquals("3 janvier 2026", VoxoDateLabels.daySeparator(Instant.parse("2026-01-03T10:00:00Z"), now, "fr", zone))
        assertEquals("January 3, 2026", VoxoDateLabels.daySeparator(Instant.parse("2026-01-03T10:00:00Z"), now, "en", zone))
        assertEquals("09:05", VoxoDateLabels.time(Instant.parse("2026-11-17T09:05:00Z"), zone))
    }
}
