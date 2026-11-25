package chat.voxo.sdk.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.models.VoxoAttachment
import chat.voxo.sdk.models.VoxoDeliveryStatus
import chat.voxo.sdk.models.VoxoFeatures
import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.ui.LocalVoxoTheme
import coil.compose.SubcomposeAsyncImage

/** Heure, statut d'envoi, pouces haut/bas — ou « Non envoyé » avec réessai. */
@Composable
internal fun MessageFooter(
    message: VoxoMessage,
    features: VoxoFeatures,
    timeLabel: String,
    locale: String,
    onFeedback: ((VoxoFeedback) -> Unit)?,
    onRetry: (() -> Unit)?,
) {
    val theme = LocalVoxoTheme.current
    if (message.hasFailed) {
        Row(Modifier.padding(top = 3.dp, end = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("⚠ " + VoxoI18n.text(locale, "messageFailed"), color = theme.danger, fontSize = 11.sp)
            if (onRetry != null) {
                Spacer(Modifier.width(8.dp))
                Text(
                    VoxoI18n.text(locale, "retryLabel"),
                    color = theme.accent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.clickable(role = Role.Button, onClick = onRetry),
                )
            }
        }
        return
    }

    val showFeedback = features.messageFeedback && message.canReceiveFeedback && onFeedback != null
    val showStatus = features.showDeliveryStatus && message.isFromUser
    Row(Modifier.padding(top = 3.dp, start = 4.dp, end = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (features.showTimestamps) Text(timeLabel, color = theme.textMuted, fontSize = 11.sp)
        if (showStatus) {
            val glyph = if (message.deliveryStatus == VoxoDeliveryStatus.ANSWERED) "✓✓" else "◷"
            Text(" $glyph", color = theme.textMuted, fontSize = 11.sp)
        }
        if (showFeedback) {
            Spacer(Modifier.width(6.dp))
            FeedbackButton("👍", VoxoI18n.text(locale, "feedbackUseful"), message.feedback == VoxoFeedback.UP) { onFeedback!!(VoxoFeedback.UP) }
            FeedbackButton("👎", VoxoI18n.text(locale, "feedbackNotUseful"), message.feedback == VoxoFeedback.DOWN) { onFeedback!!(VoxoFeedback.DOWN) }
        }
    }
}

@Composable
private fun FeedbackButton(glyph: String, label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        glyph,
        fontSize = 13.sp,
        modifier = Modifier
            .heightIn(min = 24.dp)
            .padding(horizontal = 4.dp)
            .semantics { contentDescription = label; role = Role.Button; this.selected = selected }
            .clickable(onClick = onClick),
        color = if (selected) LocalVoxoTheme.current.accent else Color.Unspecified,
    )
}

/** Pièces jointes d'un message : miniature si image avec URL, sinon une ligne de fichier. */
@Composable
internal fun AttachmentList(attachments: List<VoxoAttachment>, foreground: Color) {
    Column(Modifier.padding(bottom = 6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        attachments.forEach { attachment ->
            if (attachment.isImage && attachment.url != null) {
                SubcomposeAsyncImage(
                    model = attachment.url,
                    contentDescription = attachment.name,
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)),
                    error = { FileRow(attachment, foreground) },
                )
            } else {
                FileRow(attachment, foreground)
            }
        }
    }
}

@Composable
private fun FileRow(attachment: VoxoAttachment, foreground: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(if (attachment.isImage) "🖼" else "📄", fontSize = 13.sp)
        Spacer(Modifier.width(6.dp))
        Text(attachment.name, color = foreground, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
