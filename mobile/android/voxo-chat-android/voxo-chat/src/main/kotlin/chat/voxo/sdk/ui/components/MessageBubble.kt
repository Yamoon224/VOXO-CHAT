package chat.voxo.sdk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.models.VoxoFeatures
import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.VoxoRole
import chat.voxo.sdk.ui.LocalVoxoTheme
import chat.voxo.sdk.ui.VoxoDateLabels
import chat.voxo.sdk.ui.markdown.VoxoMarkdownBody

/**
 * Bulle d'un message. L'utilisateur à droite (couleur d'accent), l'assistant et
 * le conseiller à gauche ; le conseiller est teinté et nommé.
 */
@Composable
internal fun MessageBubble(
    message: VoxoMessage,
    features: VoxoFeatures,
    markdown: Boolean,
    agentName: String?,
    locale: String,
    onFeedback: ((VoxoFeedback) -> Unit)?,
    onRetry: (() -> Unit)?,
    onLinkClick: ((String) -> Unit)?,
) {
    val theme = LocalVoxoTheme.current
    val fromUser = message.isFromUser
    val isAgent = message.role == VoxoRole.AGENT
    val background = when {
        fromUser -> theme.userBubble
        isAgent -> theme.agentBubble
        else -> theme.botBubble
    }
    val foreground = when {
        fromUser -> theme.onUserBubble
        else -> theme.onBotBubble
    }
    val radius = theme.cornerRadiusDp.dp
    val shape = if (fromUser) RoundedCornerShape(radius, radius, 4.dp, radius) else RoundedCornerShape(radius, radius, radius, 4.dp)

    Column(
        Modifier.fillMaxWidth().padding(bottom = 6.dp),
        horizontalAlignment = if (fromUser) Alignment.End else Alignment.Start,
    ) {
        if (isAgent && agentName != null) {
            Text(agentName, color = theme.textMuted, fontSize = 11.sp, modifier = Modifier.padding(start = 4.dp, bottom = 2.dp))
        }
        Column(
            Modifier.widthIn(max = 300.dp).background(background, shape).padding(horizontal = 12.dp, vertical = 9.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            if (message.attachments.isNotEmpty()) AttachmentList(message.attachments, foreground)
            if (message.text.isNotEmpty()) {
                if (markdown && !fromUser) {
                    VoxoMarkdownBody(message.text, foreground, theme.accent, foreground.copy(alpha = 0.12f), onLinkClick = onLinkClick)
                } else {
                    Text(message.text, color = foreground, fontSize = 15.sp, lineHeight = 21.sp)
                }
            }
        }
        if (!message.isWelcome) {
            MessageFooter(message, features, VoxoDateLabels.time(message.timestamp), locale, onFeedback, onRetry)
        }
    }
}
