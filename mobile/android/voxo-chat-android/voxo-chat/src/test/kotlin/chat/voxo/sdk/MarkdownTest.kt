package chat.voxo.sdk

import chat.voxo.sdk.ui.markdown.VoxoBlockKind
import chat.voxo.sdk.ui.markdown.VoxoBlockParser
import chat.voxo.sdk.ui.markdown.VoxoInlineParser
import chat.voxo.sdk.ui.markdown.VoxoSafeUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MarkdownTest {
    @Test fun `safe url allows only web mail and phone schemes`() {
        assertEquals("https://a.b/c", VoxoSafeUrl.sanitize(" https://a.b/c "))
        assertEquals("mailto:x@y.z", VoxoSafeUrl.sanitize("mailto:x@y.z"))
        assertEquals("tel:+33123", VoxoSafeUrl.sanitize("tel:+33123"))
        assertNull(VoxoSafeUrl.sanitize("javascript:alert(1)"))
        assertNull(VoxoSafeUrl.sanitize("JaVaScRiPt:alert(1)"))
        assertNull(VoxoSafeUrl.sanitize("/relative"))
        assertNull(VoxoSafeUrl.sanitize("https://a.b/\u0000x"))
        assertNull(VoxoSafeUrl.sanitize("no-scheme"))
        assertNull(VoxoSafeUrl.sanitize(null))
    }

    @Test fun `trailing punctuation is not part of a bare url`() {
        assertEquals("https://a.b" to ").", VoxoSafeUrl.splitTrailingPunctuation("https://a.b)."))
    }

    @Test fun `blocks split paragraphs lists and code`() {
        val blocks = VoxoBlockParser.parse("Intro\nsuite\n\n- a\n- b\n1. un\n\n```\ncode\n```\nfin")
        assertEquals(
            listOf(VoxoBlockKind.PARAGRAPH, VoxoBlockKind.BULLET_LIST, VoxoBlockKind.ORDERED_LIST, VoxoBlockKind.CODE_BLOCK, VoxoBlockKind.PARAGRAPH),
            blocks.map { it.kind },
        )
        assertEquals(listOf("a", "b"), blocks[1].lines)
        assertEquals(listOf("code"), blocks[3].lines)
    }

    @Test fun `unterminated code fence runs to the end and oversized text stays raw`() {
        assertEquals(listOf("a", "b"), VoxoBlockParser.parse("```\na\nb").single().lines)
        val huge = "- x\n".repeat(3000)
        assertEquals(VoxoBlockKind.PARAGRAPH, VoxoBlockParser.parse(huge).single().kind)
    }

    @Test fun `inline styles nest and links are sanitized`() {
        val spans = VoxoInlineParser.parse("**gras _et italique_** `c` [ok](https://a.b) [bad](javascript:x) voir https://c.d.")
        assertTrue(spans.any { it.bold && it.italic && it.text == "et italique" })
        assertTrue(spans.any { it.code && it.text == "c" })
        assertEquals("https://a.b", spans.first { it.text == "ok" }.href)
        assertNull(spans.first { it.text == "bad" }.href)
        assertEquals("https://c.d", spans.first { it.text == "https://c.d" }.href)
        assertEquals(".", spans.last().text)
    }
}
