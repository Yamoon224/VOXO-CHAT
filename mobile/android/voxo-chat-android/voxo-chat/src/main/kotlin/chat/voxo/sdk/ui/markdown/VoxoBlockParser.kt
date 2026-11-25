package chat.voxo.sdk.ui.markdown

internal enum class VoxoBlockKind { PARAGRAPH, CODE_BLOCK, BULLET_LIST, ORDERED_LIST }

internal class VoxoBlock(val kind: VoxoBlockKind, val lines: List<String>) {
    val isCode: Boolean get() = kind == VoxoBlockKind.CODE_BLOCK
    val isList: Boolean get() = kind == VoxoBlockKind.BULLET_LIST || kind == VoxoBlockKind.ORDERED_LIST
    val isOrdered: Boolean get() = kind == VoxoBlockKind.ORDERED_LIST
}

/**
 * Découpe un message en blocs : paragraphes, listes (à puces ou numérotées) et
 * blocs de code. Volontairement minimal — pas de titres, tableaux ni HTML.
 * Au-delà de [MAX_LENGTH], le texte reste brut (garde-fou de performance).
 */
internal object VoxoBlockParser {
    const val MAX_LENGTH = 8000

    private val fence = Regex("^\\s*```")
    private val listItem = Regex("^\\s*([-+*]|\\d+\\.)\\s+(.+)$")
    private val ordered = Regex("\\d+\\.")

    fun parse(value: String): List<VoxoBlock> {
        if (value.length > MAX_LENGTH) return listOf(VoxoBlock(VoxoBlockKind.PARAGRAPH, value.split('\n')))

        val lines = value.replace(Regex("\\r\\n?"), "\n").split('\n')
        val blocks = mutableListOf<VoxoBlock>()
        var index = 0
        while (index < lines.size) {
            index = when {
                lines[index].isBlank() -> index + 1
                fence.containsMatchIn(lines[index]) -> readCode(lines, index, blocks)
                listItem.matches(lines[index]) -> readList(lines, index, blocks)
                else -> readParagraph(lines, index, blocks)
            }
        }
        return blocks
    }

    private fun readCode(lines: List<String>, start: Int, blocks: MutableList<VoxoBlock>): Int {
        var index = start + 1
        val content = mutableListOf<String>()
        while (index < lines.size && !fence.containsMatchIn(lines[index])) content += lines[index++]
        // Une clôture manquante en fin de texte n'est pas une erreur.
        if (index < lines.size) index++
        blocks += VoxoBlock(VoxoBlockKind.CODE_BLOCK, content)
        return index
    }

    private fun readList(lines: List<String>, start: Int, blocks: MutableList<VoxoBlock>): Int {
        val isOrdered = ordered.matches(listItem.find(lines[start])!!.groupValues[1])
        val items = mutableListOf<String>()
        var index = start
        while (index < lines.size) {
            val match = listItem.find(lines[index]) ?: break
            // Un changement de type ferme la liste.
            if (ordered.matches(match.groupValues[1]) != isOrdered) break
            items += match.groupValues[2]
            index++
        }
        blocks += VoxoBlock(if (isOrdered) VoxoBlockKind.ORDERED_LIST else VoxoBlockKind.BULLET_LIST, items)
        return index
    }

    private fun readParagraph(lines: List<String>, start: Int, blocks: MutableList<VoxoBlock>): Int {
        val paragraph = mutableListOf<String>()
        var index = start
        while (index < lines.size && lines[index].isNotBlank() &&
            !fence.containsMatchIn(lines[index]) && !listItem.matches(lines[index])
        ) {
            paragraph += lines[index++]
        }
        blocks += VoxoBlock(VoxoBlockKind.PARAGRAPH, paragraph)
        return index
    }
}
