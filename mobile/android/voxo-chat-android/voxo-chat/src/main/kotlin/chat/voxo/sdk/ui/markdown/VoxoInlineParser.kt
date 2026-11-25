package chat.voxo.sdk.ui.markdown

/**
 * Fragment de texte inline. Les styles imbriqués (`**gras _italique_**`) sont
 * aplatis : chaque fragment porte l'ensemble de ses styles. [href] n'est posé
 * que sur un lien que l'on sait ouvrir.
 */
internal data class VoxoSpan(
    val text: String,
    val bold: Boolean = false,
    val italic: Boolean = false,
    val code: Boolean = false,
    val href: String? = null,
)

/** Gras, italique, code, liens `[x](url)` et URL nues. Pas d'HTML. */
internal object VoxoInlineParser {
    private val pattern = Regex(
        "(`[^`\\n]+`" +
            "|\\*\\*[^*\\n]+\\*\\*" +
            "|__[^_\\n]+__" +
            "|\\*[^*\\n]+\\*" +
            "|_[^_\\n]+_" +
            "|\\[[^\\]\\n]+\\]\\([^\\s)]+\\)" +
            "|https?://[^\\s<]+)",
        RegexOption.IGNORE_CASE,
    )
    private val linkPattern = Regex("^\\[([^\\]]+)\\]\\(([^)]+)\\)$")

    fun parse(value: String, base: VoxoSpan = VoxoSpan("")): List<VoxoSpan> {
        val spans = mutableListOf<VoxoSpan>()
        var cursor = 0
        for (match in pattern.findAll(value)) {
            if (match.range.first > cursor) spans += base.copy(text = value.substring(cursor, match.range.first))
            cursor = match.range.last + 1
            spans += token(match.value, base)
        }
        if (cursor < value.length) spans += base.copy(text = value.substring(cursor))
        return spans
    }

    private fun token(token: String, base: VoxoSpan): List<VoxoSpan> = when {
        token.startsWith("`") -> listOf(base.copy(text = token.substring(1, token.length - 1), code = true))
        wrapped(token, "**") || wrapped(token, "__") -> parse(token.substring(2, token.length - 2), base.copy(bold = true))
        wrapped(token, "*") || wrapped(token, "_") -> parse(token.substring(1, token.length - 1), base.copy(italic = true))
        token.startsWith("[") -> {
            val match = linkPattern.find(token)
            if (match == null) listOf(base.copy(text = token)) else listOf(link(match.groupValues[1], match.groupValues[2], base))
        }
        else -> {
            // URL nue : la ponctuation finale n'en fait pas partie.
            val (url, trailing) = VoxoSafeUrl.splitTrailingPunctuation(token)
            listOfNotNull(link(url, url, base), if (trailing.isNotEmpty()) base.copy(text = trailing) else null)
        }
    }

    /** Un lien qu'on ne saurait pas ouvrir s'affiche en texte inerte, pas en lien mort. */
    private fun link(label: String, rawUrl: String, base: VoxoSpan): VoxoSpan =
        base.copy(text = label, href = VoxoSafeUrl.sanitize(rawUrl))

    private fun wrapped(token: String, marker: String) =
        token.length > marker.length * 2 && token.startsWith(marker) && token.endsWith(marker)
}
