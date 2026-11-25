package chat.voxo.sdk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoConnectivity
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.ui.LocalVoxoTheme
import coil.compose.SubcomposeAsyncImage

/** En-tête : avatar, nom, statut (conseiller ou connectivité), actions. */
@Composable
internal fun ChatHeader(
    config: VoxoChatbotConfig,
    connectivity: VoxoConnectivity,
    handoff: VoxoHandoff,
    canRate: Boolean,
    locale: String,
    onRate: () -> Unit,
    onNewConversation: () -> Unit,
    onHistory: () -> Unit,
    onClose: (() -> Unit)?,
    onLocaleChange: ((String) -> Unit)?,
) {
    val theme = LocalVoxoTheme.current
    Row(
        Modifier.fillMaxWidth().background(theme.accent).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(config)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(config.name, color = theme.onAccent, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle(config, connectivity, handoff, locale), color = theme.onAccent.copy(alpha = 0.8f), fontSize = 12.sp, maxLines = 1)
        }
        if (canRate) {
            Text(
                "★",
                color = theme.onAccent,
                fontSize = 20.sp,
                modifier = Modifier.clickable(onClickLabel = VoxoI18n.text(locale, "endAndRateTooltip"), onClick = onRate).padding(8.dp),
            )
        }
        OverflowMenu(locale, onHistory, onNewConversation, onLocaleChange)
        if (onClose != null) HeaderIcon(Icons.Filled.Close, VoxoI18n.text(locale, "closeChatTooltip"), onClose)
    }
}

/**
 * Actions secondaires (historique, nouvelle conversation, langue) regroupées : l'en-tête garde ainsi la
 * place d'afficher le nom et le statut en entier, par exemple « Vous échangez avec Léa ».
 */
@Composable
private fun OverflowMenu(locale: String, onHistory: () -> Unit, onNewConversation: () -> Unit, onLocaleChange: ((String) -> Unit)?) {
    val theme = LocalVoxoTheme.current
    var open by remember { mutableStateOf(false) }
    Box {
        Text(
            "⋮",
            color = theme.onAccent,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.clickable(onClickLabel = VoxoI18n.text(locale, "moreActions")) { open = true }.padding(horizontal = 12.dp, vertical = 8.dp),
        )
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, containerColor = theme.surface) {
            MenuItem(VoxoI18n.text(locale, "historyTitle")) { open = false; onHistory() }
            MenuItem(VoxoI18n.text(locale, "newConversationTooltip")) { open = false; onNewConversation() }
            if (onLocaleChange != null) {
                val other = if (locale == "en") "fr" else "en"
                MenuItem("${VoxoI18n.text(locale, "languageLabel")} : ${other.uppercase()}") { open = false; onLocaleChange(other) }
            }
        }
    }
}

@Composable
private fun MenuItem(label: String, onClick: () -> Unit) {
    DropdownMenuItem(text = { Text(label, color = LocalVoxoTheme.current.text, fontSize = 15.sp) }, onClick = onClick)
}

@Composable
private fun HeaderIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(onClick) { Icon(icon, description, tint = LocalVoxoTheme.current.onAccent) }
}

@Composable
private fun Avatar(config: VoxoChatbotConfig) {
    val theme = LocalVoxoTheme.current
    val initial = config.name.firstOrNull()?.uppercase() ?: "?"
    val fallback: @Composable () -> Unit = {
        Box(Modifier.size(36.dp).background(theme.onAccent.copy(alpha = 0.2f), CircleShape), Alignment.Center) {
            Text(initial, color = theme.onAccent, fontWeight = FontWeight.Bold)
        }
    }
    val url = config.avatarUrl
    if (url == null) {
        fallback()
    } else {
        // Une URL d'avatar peut ne pas charger : on retombe sur l'initiale.
        SubcomposeAsyncImage(
            model = url,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(36.dp).clip(CircleShape),
            error = { fallback() },
        )
    }
}

private fun subtitle(config: VoxoChatbotConfig, connectivity: VoxoConnectivity, handoff: VoxoHandoff, locale: String): String {
    handoff.labelFor(locale)?.let { return it }
    if (!config.features.connectivityStatus) return VoxoI18n.text(locale, "assistantOnlyStatus")
    return when (connectivity) {
        VoxoConnectivity.AVAILABLE -> VoxoI18n.text(locale, "assistantAvailable")
        VoxoConnectivity.UNAVAILABLE -> VoxoI18n.text(locale, "serviceUnavailable")
        VoxoConnectivity.CONNECTING -> VoxoI18n.text(locale, "connectingStatus")
    }
}
