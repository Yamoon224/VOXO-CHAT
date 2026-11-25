package chat.voxo.sdk.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.core.VoxoLimits
import chat.voxo.sdk.ui.LocalVoxoTheme

/** Note 1-5 et commentaire facultatif. Une note à zéro n'est jamais envoyée : le backend la refuse. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RatingSheet(locale: String, onDismiss: () -> Unit, onSubmit: (rating: Int, comment: String) -> Unit) {
    val theme = LocalVoxoTheme.current
    var rating by remember { mutableIntStateOf(0) }
    var comment by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = theme.surface) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp).navigationBarsPadding().imePadding()) {
            Text(VoxoI18n.text(locale, "ratingTitle"), color = theme.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Row(
                Modifier.padding(top = 14.dp).semantics { contentDescription = VoxoI18n.text(locale, "ratingGroup") },
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                (1..5).forEach { value ->
                    Text(
                        if (value <= rating) "★" else "☆",
                        color = if (value <= rating) theme.accent else theme.textMuted,
                        fontSize = 30.sp,
                        modifier = Modifier
                            .widthIn(min = 44.dp)
                            .heightIn(min = 44.dp)
                            .semantics { contentDescription = VoxoI18n.text(locale, "ratingValue", mapOf("count" to value)) }
                            .clickable(role = Role.Button) { rating = value; showError = false },
                    )
                }
            }
            if (showError) Text(VoxoI18n.text(locale, "ratingRequired"), color = theme.danger, fontSize = 12.sp)
            OutlinedTextField(
                value = comment,
                onValueChange = { comment = it.take(VoxoLimits.MAX_FEEDBACK_LENGTH) },
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                placeholder = { Text(VoxoI18n.text(locale, "ratingComment"), color = theme.textMuted) },
                minLines = 3,
                supportingText = { Text("${comment.length}/${VoxoLimits.MAX_FEEDBACK_LENGTH}", color = theme.textMuted) },
            )
            Row(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onDismiss, Modifier.weight(1f)) { Text(VoxoI18n.text(locale, "cancel"), color = theme.textMuted) }
                Button(
                    onClick = { if (rating == 0) showError = true else onSubmit(rating, comment.trim()) },
                    modifier = Modifier.weight(1f).padding(start = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = theme.accent, contentColor = theme.onAccent),
                ) { Text(VoxoI18n.text(locale, "send")) }
            }
        }
    }
}
