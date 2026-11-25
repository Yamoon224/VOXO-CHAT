package chat.voxo.sdk.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.ui.components.ChatHeader
import chat.voxo.sdk.ui.components.ComposerBar
import chat.voxo.sdk.ui.components.HistoryScreen
import chat.voxo.sdk.ui.components.MessageList
import chat.voxo.sdk.ui.components.RatingSheet
import kotlinx.coroutines.launch

/**
 * Écran de chat prêt à l'emploi, construit sur le core : il n'appelle jamais le
 * réseau lui-même. [theme] null = dérivé de la config distante (et du mode
 * sombre du système si le propriétaire n'a rien forcé).
 */
@Composable
fun VoxoChatView(
    controller: VoxoController,
    modifier: Modifier = Modifier,
    theme: VoxoTheme? = null,
    onClose: (() -> Unit)? = null,
) {
    val ui by controller.state.collectAsStateWithLifecycle()
    val resolved = theme ?: VoxoTheme.fromConfig(ui.chatbot, isSystemInDarkTheme())
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var showRating by remember { mutableStateOf(false) }
    var showHistory by remember { mutableStateOf(false) }
    val pickFiles = VoxoChatActions.rememberFilePicker(controller)

    // `init` est idempotent : un second écran sur le même controller ne relance rien.
    LaunchedEffect(controller) { controller.init() }
    DisposableEffect(controller) {
        controller.setOpen(true)
        onDispose { controller.setOpen(false) }
    }
    LaunchedEffect(ui.lastError) {
        val error = ui.lastError ?: return@LaunchedEffect
        controller.clearError()
        snackbar.showSnackbar(error)
    }

    CompositionLocalProvider(LocalVoxoTheme provides resolved) {
        Box(modifier.fillMaxSize().background(resolved.surface)) {
            Column(Modifier.fillMaxSize().statusBarsPadding()) {
                ChatHeader(
                    config = ui.chatbot,
                    connectivity = ui.connectivity,
                    handoff = ui.handoff,
                    canRate = ui.canRate,
                    locale = ui.locale,
                    onRate = { showRating = true },
                    onNewConversation = { scope.launch { controller.startNewSession() } },
                    onHistory = { showHistory = true },
                    onClose = onClose,
                    onLocaleChange = if (controller.config.options.showLanguageSwitcher) controller::setLocale else null,
                )
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    // Avant l'arrivée de la config, un fil vide ferait clignoter le thème par défaut.
                    if (!ui.isReady && ui.messages.isEmpty()) {
                        CircularProgressIndicator(Modifier.align(Alignment.Center), color = resolved.accent)
                    } else {
                        MessageList(
                            messages = ui.messages,
                            features = ui.chatbot.features,
                            markdown = ui.chatbot.enableMarkdown,
                            isTyping = ui.isLoading && controller.config.options.enableTyping,
                            agentName = ui.handoff.agentName,
                            locale = ui.locale,
                            onSuggestion = { scope.launch { controller.sendMessage(it) } },
                            onFeedback = { message, value -> scope.launch { controller.submitFeedback(message, value) } },
                            onRetry = { scope.launch { controller.retry(it) } },
                            onLinkClick = { VoxoChatActions.openLink(context, controller, it) },
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
                ComposerBar(
                    pending = ui.pendingAttachments,
                    maxFiles = ui.chatbot.maxAttachments,
                    isSending = ui.isLoading,
                    attachmentsEnabled = ui.chatbot.features.attachments,
                    locale = ui.locale,
                    onSend = { scope.launch { controller.sendMessage(it) } },
                    onPickFiles = pickFiles,
                    onRemoveAttachment = controller.attachments::remove,
                    onActivity = controller::notifyUserActivity,
                    onTyping = controller::notifyTyping,
                )
            }
            SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
            if (showHistory) HistoryScreen(controller, ui.chatbot, ui.locale, onBack = { showHistory = false })
        }

        if (showRating) {
            RatingSheet(
                locale = ui.locale,
                onDismiss = { showRating = false },
                onSubmit = { rating, comment ->
                    showRating = false
                    scope.launch {
                        if (controller.endConversation(rating, comment)) {
                            snackbar.showSnackbar(VoxoI18n.text(controller.config.locale, "ratingThanks"))
                        }
                    }
                },
            )
        }
    }
}
