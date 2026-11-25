package chat.voxo.sdk.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.core.VoxoI18n
import coil.compose.SubcomposeAsyncImage

/**
 * Bouton flottant aux couleurs du chatbot. Ne gère pas la navigation : c'est à
 * l'app hôte d'afficher [VoxoChatView] dans [onClick] (écran, dialogue…).
 */
@Composable
fun VoxoLauncher(
    controller: VoxoController,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    theme: VoxoTheme? = null,
) {
    val ui by controller.state.collectAsStateWithLifecycle()
    val resolved = theme ?: VoxoTheme.fromConfig(ui.chatbot, isSystemInDarkTheme())
    val label = VoxoI18n.text(ui.locale, "openChat")

    FloatingActionButton(
        onClick = onClick,
        modifier = modifier.semantics { contentDescription = label },
        containerColor = resolved.accent,
        contentColor = resolved.onAccent,
    ) {
        val url = ui.chatbot.launcherIconUrl
        if (url == null) {
            Icon(Icons.Filled.Email, null)
        } else {
            // Icône de marque : peut ne pas charger, on retombe sur l'icône par défaut.
            SubcomposeAsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(26.dp).clip(CircleShape),
                error = { Icon(Icons.Filled.Email, null) },
            )
        }
    }
}
