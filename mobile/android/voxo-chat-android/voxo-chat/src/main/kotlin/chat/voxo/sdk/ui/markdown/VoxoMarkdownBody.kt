package chat.voxo.sdk.ui.markdown

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Rendu natif d'un sous-ensemble de Markdown (gras, italique, code, liens,
 * listes, blocs de code). [onLinkClick] reçoit uniquement des URL déjà filtrées
 * par [VoxoSafeUrl]. Sans [onLinkClick], les liens s'affichent en texte simple.
 */
@Composable
internal fun VoxoMarkdownBody(
    text: String,
    color: Color,
    linkColor: Color,
    codeBackground: Color,
    modifier: Modifier = Modifier,
    onLinkClick: ((String) -> Unit)? = null,
) {
    val blocks = remember(text) { VoxoBlockParser.parse(text) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        blocks.forEach { block ->
            when {
                block.isCode -> CodeBlock(block.lines.joinToString("\n"), color, codeBackground)
                block.isList -> ListBlock(block, color, linkColor, codeBackground, onLinkClick)
                else -> Inline(block.lines.joinToString("\n"), color, linkColor, codeBackground, onLinkClick)
            }
        }
    }
}

@Composable
private fun ListBlock(
    block: VoxoBlock,
    color: Color,
    linkColor: Color,
    codeBackground: Color,
    onLinkClick: ((String) -> Unit)?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        block.lines.forEachIndexed { index, item ->
            Row {
                Text(if (block.isOrdered) "${index + 1}." else "•", color = color, fontSize = 15.sp, modifier = Modifier.padding(end = 6.dp))
                Inline(item, color, linkColor, codeBackground, onLinkClick)
            }
        }
    }
}

@Composable
private fun CodeBlock(code: String, color: Color, background: Color) {
    Text(
        code,
        color = color,
        fontFamily = FontFamily.Monospace,
        fontSize = 13.sp,
        modifier = Modifier
            .background(background, RoundedCornerShape(8.dp))
            .horizontalScroll(rememberScrollState())
            .padding(8.dp)
            .widthIn(min = 0.dp),
    )
}

@Composable
private fun Inline(
    text: String,
    color: Color,
    linkColor: Color,
    codeBackground: Color,
    onLinkClick: ((String) -> Unit)?,
) {
    val annotated = remember(text, color, linkColor, codeBackground, onLinkClick) { annotate(text, linkColor, codeBackground, onLinkClick) }
    Text(annotated, style = TextStyle(color = color, fontSize = 15.sp, lineHeight = 21.sp))
}

/**
 * Les liens sont de vrais `LinkAnnotation` (accessibles, activables au clavier et à TalkBack). Sans
 * [onLinkClick], le lien s'affiche en texte inerte : aucun lien mort.
 */
private fun annotate(text: String, linkColor: Color, codeBackground: Color, onLinkClick: ((String) -> Unit)?): AnnotatedString =
    buildAnnotatedString {
        VoxoInlineParser.parse(text).forEach { span ->
            val style = SpanStyle(
                fontWeight = if (span.bold) FontWeight.Bold else null,
                fontStyle = if (span.italic) FontStyle.Italic else null,
                fontFamily = if (span.code) FontFamily.Monospace else null,
                background = if (span.code) codeBackground else Color.Unspecified,
            )
            val href = span.href
            if (href != null && onLinkClick != null) {
                val link = LinkAnnotation.Url(
                    href,
                    TextLinkStyles(style.merge(SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline))),
                ) { onLinkClick(href) }
                withLink(link) { append(span.text) }
            } else {
                withStyle(style) { append(span.text) }
            }
        }
    }
