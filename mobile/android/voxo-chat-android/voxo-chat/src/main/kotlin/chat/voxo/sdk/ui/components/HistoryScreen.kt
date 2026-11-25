package chat.voxo.sdk.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoArchivedConversation
import chat.voxo.sdk.core.VoxoArchivedView
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.core.VoxoException
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.ui.LocalVoxoTheme
import chat.voxo.sdk.ui.VoxoDateLabels

/** Ce que l'écran affiche d'une conversation archivée : en cours de chargement, lue, ou en échec. */
private sealed interface Transcript {
    data object Loading : Transcript
    data class Loaded(val view: VoxoArchivedView) : Transcript
    data class Failed(val message: String) : Transcript
}

/**
 * Historique local des conversations terminées, puis transcription **en lecture seule** de celle qu'on
 * touche : ni composeur, ni retour, ni avis. La session active n'est jamais modifiée.
 */
@Composable
internal fun HistoryScreen(controller: VoxoController, chatbot: VoxoChatbotConfig, locale: String, onBack: () -> Unit) {
    val theme = LocalVoxoTheme.current
    var archives by remember { mutableStateOf<List<VoxoArchivedConversation>?>(null) }
    var opened by remember { mutableStateOf<VoxoArchivedConversation?>(null) }
    var transcript by remember { mutableStateOf<Transcript>(Transcript.Loading) }

    val focus = LocalFocusManager.current
    // Le champ de saisie du chat garde sinon le focus, et son clavier reste ouvert par-dessus la liste.
    LaunchedEffect(Unit) { focus.clearFocus(); archives = controller.history() }
    LaunchedEffect(opened) {
        val target = opened ?: return@LaunchedEffect
        transcript = Transcript.Loading
        transcript = try {
            Transcript.Loaded(controller.archivedConversation(target.sessionId))
        } catch (error: VoxoException) {
            Transcript.Failed(error.message)
        }
    }

    // Retour : de la transcription vers la liste, puis de la liste vers le chat.
    BackHandler { if (opened != null) opened = null else onBack() }

    Column(Modifier.fillMaxSize().background(theme.surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().background(theme.accent).padding(horizontal = 8.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "←",
                color = theme.onAccent,
                fontSize = 22.sp,
                modifier = Modifier
                    .clickable(role = Role.Button, onClickLabel = VoxoI18n.text(locale, "backLabel")) { if (opened != null) opened = null else onBack() }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
            Text(
                opened?.title ?: VoxoI18n.text(locale, "historyTitle"),
                color = theme.onAccent, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        val current = opened
        if (current == null) ArchiveList(archives, locale, onOpen = { opened = it }) else TranscriptView(transcript, chatbot, locale)
    }
}

@Composable
private fun ArchiveList(archives: List<VoxoArchivedConversation>?, locale: String, onOpen: (VoxoArchivedConversation) -> Unit) {
    val theme = LocalVoxoTheme.current
    when {
        archives == null -> Centered { CircularProgressIndicator(color = theme.accent) }
        archives.isEmpty() -> Centered { Text(VoxoI18n.text(locale, "noHistory"), color = theme.textMuted, fontSize = 15.sp) }
        else -> LazyColumn(Modifier.fillMaxSize()) {
            items(archives, key = { it.sessionId }) { item ->
                Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { onOpen(item) }.padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Text(item.title, color = theme.text, fontSize = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(VoxoDateLabels.daySeparator(item.endedAt, locale = locale), color = theme.textMuted, fontSize = 12.sp)
                }
                HorizontalDivider(color = theme.border)
            }
        }
    }
}

@Composable
private fun TranscriptView(transcript: Transcript, chatbot: VoxoChatbotConfig, locale: String) {
    val theme = LocalVoxoTheme.current
    when (transcript) {
        Transcript.Loading -> Centered { CircularProgressIndicator(color = theme.accent) }
        is Transcript.Failed -> Centered { Text(transcript.message, color = theme.danger, fontSize = 15.sp, modifier = Modifier.padding(24.dp)) }
        is Transcript.Loaded -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp), verticalArrangement = Arrangement.Top) {
            items(transcript.view.messages, key = { it.id }) { message ->
                MessageBubble(
                    message = message,
                    features = chatbot.features,
                    markdown = chatbot.enableMarkdown,
                    agentName = transcript.view.handoff.agentName,
                    locale = locale,
                    onFeedback = null,
                    onRetry = null,
                    onLinkClick = null,
                )
            }
        }
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), Alignment.Center) { content() }
}
