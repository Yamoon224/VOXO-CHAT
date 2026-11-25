package chat.voxo.sdk.core

import android.content.Context
import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.VoxoRole
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient

/**
 * Point d'entrée du core, utilisable seul pour construire son propre écran :
 * `init()`, puis observer [state] et appeler [sendMessage], [retry], etc.
 *
 * Toutes les mutations passent par le contexte de [scope] (principal par
 * défaut) : appelez-le depuis le thread principal.
 */
class VoxoController internal constructor(
    val config: VoxoConfig,
    keyValueStore: VoxoKeyValueStore,
    imageCompressor: VoxoImageCompressor,
    httpClient: OkHttpClient,
    dispatcher: CoroutineDispatcher,
) {
    constructor(
        context: Context,
        config: VoxoConfig,
        keyValueStore: VoxoKeyValueStore = VoxoDataStore(context),
        imageCompressor: VoxoImageCompressor = VoxoAndroidImageCompressor(context),
    ) : this(config.also { if (it.appId == null) it.appId = context.packageName }, keyValueStore, imageCompressor, OkHttpClient(), Dispatchers.Main.immediate)

    private val scope = CoroutineScope(SupervisorJob() + dispatcher)
    private val conversation = VoxoConversationState()
    private val rateLimiter = VoxoRateLimiter()
    private val api = VoxoApiClient(config, httpClient)
    private val socket = VoxoSocket(config, scope, httpClient)
    private val sync = VoxoConversationSync(api, socket, VoxoSessionStore(config, keyValueStore), conversation, config)
    private val push = VoxoPushRegistrar(api, sync, config) { conversation.sessionId }

    // L'aperçu de saisie ne part que si le propriétaire l'a activé ET qu'un conseiller a pris la main.
    private val typing = VoxoTypingSender(
        scope = scope,
        isEligible = { config.options.enableLiveTyping && chatbot.features.liveTypingPreview && handoff.isHandledByHuman },
        send = socket::sendTyping,
    )

    /** File des pièces jointes : `addAll(chemins)`, `remove(id)`. */
    val attachments = VoxoAttachmentQueue(api, config, imageCompressor, ::publish, ::reportError)

    private val sender = VoxoMessageSender(
        api, config, conversation, rateLimiter, ::publish, ::reportError, ::adoptNewSession, { userId },
    )
    private val feedback = VoxoFeedbackService(api, config, conversation, ::publish, ::reportError)
    private val realtime = VoxoRealtimeBinder(
        scope, sync, conversation, ::publish, ::reportError, ::applyHandoff, ::applyConnectivity,
        ::addAssistantMessage, { isOpen && !conversation.sessionEnded },
    )
    private val composer = VoxoComposer(
        sender, attachments, conversation, config, ::publish, ::reportError,
        { realtime.touch(); realtime.resetReminders() }, ::persist, ::startNewSession,
    )

    private val mutableState = MutableStateFlow(VoxoUiState(locale = config.locale))

    /** État courant, à collecter depuis l'UI. */
    val state: StateFlow<VoxoUiState> = mutableState

    private var chatbot = VoxoChatbotConfig()
    private var connectivity = VoxoConnectivity.CONNECTING
    private var handoff = VoxoHandoff()
    private var userId = ""
    private var lastError: String? = null
    private var isReady = false
    private var isOpen = false
    private var disposed = false

    /** Restaure la session, charge la config distante, ouvre le temps réel. Idempotent. */
    suspend fun init() {
        if (isReady || disposed) return
        sync.restoreLocale()
        userId = sync.userId()
        val reminderCount = sync.restore()

        val (loaded, initialConnectivity) = sync.loadConfig()
        if (disposed) return
        chatbot = loaded
        connectivity = initialConnectivity
        attachments.applyServerLimits(loaded.maxAttachments, loaded.maxAttachmentBytes)

        if (conversation.isEmpty) addWelcomeMessage()
        if (disposed) return

        realtime.start(reminderCount, config.options.enableInactivityMonitor)
        // Le fil réel fait foi sur le restauré : un agent a pu répondre app fermée.
        scope.launch { realtime.refreshHistory() }

        push.load()
        push.syncSession()

        isReady = true
        publish()
    }

    /** À appeler quand l'écran de chat s'ouvre ou se ferme : l'inactivité ne court que s'il est ouvert. */
    fun setOpen(open: Boolean) {
        isOpen = open
        if (!open) return
        realtime.touch()
        scope.launch { realtime.refreshConnectivity(force = true) }
    }

    fun notifyUserActivity() = realtime.touch()

    fun setLocale(locale: String) {
        config.locale = VoxoI18n.normalize(locale)
        scope.launch { sync.saveLocale() }
        publish()
    }

    suspend fun sendMessage(text: String) {
        typing.submit("") // efface l'aperçu chez le conseiller avant que le message n'arrive
        composer.send(text)
    }

    /** À appeler à chaque modification du champ de saisie. Sans effet hors aperçu de saisie autorisé (voir CONTRACT.md). */
    fun notifyTyping(text: String) = typing.submit(text)

    /** Confie le jeton FCM/APNs obtenu par l'app hôte, lié à la session courante (sans effet si non activé côté propriétaire). */
    suspend fun registerPushToken(token: String, platform: VoxoPushPlatform) = push.register(token, platform)

    /** Oublie le jeton (déconnexion de l'utilisateur dans l'app hôte). */
    suspend fun unregisterPushToken() = push.unregister()

    /** Relit une conversation archivée en lecture seule ; la session active n'est pas modifiée. */
    suspend fun archivedConversation(sessionId: String): VoxoArchivedView = sync.loadArchived(sessionId)

    suspend fun retry(messageId: String) = composer.retry(messageId)

    suspend fun submitFeedback(message: VoxoMessage, value: VoxoFeedback) {
        if (!chatbot.features.messageFeedback) return
        feedback.submitMessageFeedback(message, value)
        persist()
    }

    /** Clôture avec note facultative (1-5) et commentaire ; `true` si le serveur l'a acceptée. */
    suspend fun endConversation(rating: Int? = null, comment: String? = null): Boolean {
        val closed = feedback.endConversation(rating, comment)
        if (closed) persist()
        return closed
    }

    suspend fun startNewSession() {
        sync.archive(conversation.sessionId, conversation.messages.toList())
        conversation.reset()
        rateLimiter.reset()
        handoff = VoxoHandoff()
        realtime.reconnect()
        addWelcomeMessage()
        persist()
        push.syncSession()
        publish()
    }

    suspend fun history(): List<VoxoArchivedConversation> = sync.history()

    fun clearError() {
        if (lastError == null) return
        lastError = null
        publish()
    }

    fun dispose() {
        disposed = true
        realtime.dispose()
        scope.cancel()
    }

    /** Signale une erreur à l'utilisateur (affichée une fois par l'UI, puis acquittée). */
    fun reportError(message: String) {
        lastError = message
        publish()
    }

    private suspend fun adoptNewSession(previousSessionId: String) {
        sync.archive(previousSessionId, conversation.messages.toList())
        realtime.reconnect()
        push.syncSession()
    }

    private suspend fun addWelcomeMessage() {
        if (!conversation.isEmpty) return
        val suggestions = sync.quickReplies()
        if (disposed || !conversation.isEmpty) return
        conversation.add(
            VoxoMessage(role = VoxoRole.ASSISTANT, text = chatbot.welcomeMessage, suggestions = suggestions, isWelcome = true),
        )
        publish()
    }

    private fun addAssistantMessage(text: String) {
        conversation.add(VoxoMessage(role = VoxoRole.ASSISTANT, text = text))
        scope.launch { persist() }
        publish()
    }

    private fun applyHandoff(value: VoxoHandoff) {
        handoff = value
        publish()
    }

    private fun applyConnectivity(value: VoxoConnectivity) {
        if (connectivity == value) return
        connectivity = value
        publish()
    }

    private suspend fun persist() = sync.persist(realtime.reminderCount)

    private fun publish() {
        if (disposed) return
        mutableState.value = VoxoUiState(
            messages = conversation.ordered,
            chatbot = chatbot,
            connectivity = connectivity,
            handoff = handoff,
            pendingAttachments = attachments.items,
            sessionId = conversation.sessionId,
            locale = config.locale,
            isReady = isReady,
            isLoading = composer.isSending,
            isUploading = attachments.isUploading,
            sessionEnded = conversation.sessionEnded,
            canRate = chatbot.features.conversationRating && conversation.hasServerReply,
            lastError = lastError,
        )
    }
}
