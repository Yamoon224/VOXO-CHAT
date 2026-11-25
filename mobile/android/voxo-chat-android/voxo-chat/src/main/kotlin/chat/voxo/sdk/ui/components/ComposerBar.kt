package chat.voxo.sdk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.models.VoxoPendingAttachment
import chat.voxo.sdk.ui.LocalVoxoTheme

/** Zone de saisie : pièces en attente, bouton de jointure, champ, envoi. */
@Composable
internal fun ComposerBar(
    pending: List<VoxoPendingAttachment>,
    maxFiles: Int,
    isSending: Boolean,
    attachmentsEnabled: Boolean,
    locale: String,
    onSend: (String) -> Unit,
    onPickFiles: () -> Unit,
    onRemoveAttachment: (String) -> Unit,
    onActivity: () -> Unit,
    onTyping: (String) -> Unit,
) {
    val theme = LocalVoxoTheme.current
    var text by rememberSaveable { mutableStateOf("") }
    val canSend = !isSending && (text.isNotBlank() || pending.any { it.isUploaded })

    fun submit() {
        if (!canSend) return
        onSend(text)
        text = ""
    }

    Column(Modifier.fillMaxWidth().background(theme.surface).navigationBarsPadding().imePadding()) {
        PendingAttachments(pending, locale, onRemoveAttachment)
        Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (attachmentsEnabled) {
                val full = pending.size >= maxFiles
                Text(
                    "📎",
                    fontSize = 20.sp,
                    modifier = Modifier
                        .semantics {
                            contentDescription = if (full) VoxoI18n.text(locale, "attachLimitReached", mapOf("count" to maxFiles))
                            else VoxoI18n.text(locale, "attachFileTooltip")
                        }
                        .clickable(enabled = !full, onClick = onPickFiles)
                        .padding(8.dp),
                )
            }
            TextField(
                value = text,
                onValueChange = { text = it; onActivity(); onTyping(it) },
                modifier = Modifier.weight(1f),
                placeholder = { Text(VoxoI18n.text(locale, "composerHint"), color = theme.textMuted, fontSize = 15.sp) },
                maxLines = 5,
                shape = RoundedCornerShape(22.dp),
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = theme.surfaceMuted,
                    unfocusedContainerColor = theme.surfaceMuted,
                    focusedTextColor = theme.text,
                    unfocusedTextColor = theme.text,
                    cursorColor = theme.accent,
                    focusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent,
                    unfocusedIndicatorColor = androidx.compose.ui.graphics.Color.Transparent,
                ),
            )
            IconButton(onClick = ::submit, enabled = canSend) {
                Icon(
                    Icons.AutoMirrored.Filled.Send,
                    VoxoI18n.text(locale, "sendMessageLabel"),
                    tint = if (canSend) theme.accent else theme.textMuted,
                )
            }
        }
    }
}

@Composable
private fun PendingAttachments(items: List<VoxoPendingAttachment>, locale: String, onRemove: (String) -> Unit) {
    if (items.isEmpty()) return
    val theme = LocalVoxoTheme.current
    Row(
        Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        items.forEach { item ->
            Row(
                Modifier.border(1.dp, theme.border, RoundedCornerShape(999.dp)).padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (item.isImage) "🖼" else "📄", fontSize = 12.sp)
                Text(
                    " ${if (item.isUploaded) item.name else VoxoI18n.text(locale, "uploadingLabel")}",
                    color = theme.text, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(end = 6.dp),
                )
                Text(
                    "✕",
                    color = theme.textMuted,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .semantics { contentDescription = VoxoI18n.text(locale, "removeAttachment", mapOf("name" to item.name)) }
                        .clickable { onRemove(item.localId) },
                )
            }
        }
    }
}
