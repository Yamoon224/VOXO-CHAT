import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Point d'entrée du core, utilisable seul pour construire son propre écran : `await init()`,
/// puis observer `state` (ou `stateStream`) et appeler `sendMessage`, `retry`, etc.
///
/// Isolé sur l'acteur principal : toutes les mutations passent par le thread principal. Le
/// core ne dépend ni de SwiftUI ni de Combine ; l'UI fournie s'y branche par `observe`.
@MainActor
public final class VoxoController {
    public let config: VoxoConfig

    private let conversation: VoxoConversationState
    private let rateLimiter: VoxoRateLimiter
    let sync: VoxoConversationSync
    // Enregistrement du jeton push et aperçu de saisie — API publique dans `VoxoController+Features.swift`.
    var push: VoxoPushRegistrar!
    var typing: VoxoTypingSender!
    private var sender: VoxoMessageSender!
    private var feedback: VoxoFeedbackService!
    private var realtime: VoxoRealtimeBinder!
    private var composer: VoxoComposer!

    /// File des pièces jointes : `addAll(chemins)`, `remove(id)`.
    public private(set) var attachments: VoxoAttachmentQueue!

    public private(set) var state: VoxoUiState
    /// Observateurs de `state` — voir `VoxoController+Observation.swift`.
    var observers: [UUID: (VoxoUiState) -> Void] = [:]

    private var chatbot = VoxoChatbotConfig()
    private var connectivity: VoxoConnectivity = .connecting
    private var handoff = VoxoHandoff()
    private var userId = ""
    private var lastError: String?
    private var isReady = false
    private var isOpen = false
    private var disposed = false

    public init(
        config: VoxoConfig,
        keyValueStore: VoxoKeyValueStore = VoxoUserDefaultsStore(),
        imageCompressor: VoxoImageCompressor = VoxoController.defaultCompressor(),
        urlSession: URLSession = .shared
    ) {
        // L'identifiant de l'app hôte part en `X-App-Id` : par défaut, son bundle identifier.
        if config.appId == nil { config.appId = Bundle.main.bundleIdentifier }
        let conversation = VoxoConversationState()
        let rateLimiter = VoxoRateLimiter()
        self.config = config
        self.conversation = conversation
        self.rateLimiter = rateLimiter
        var initial = VoxoUiState()
        initial.locale = config.locale
        self.state = initial

        let api = VoxoApiClient(config: config, session: urlSession)
        let store = VoxoSessionStore(config: config, store: keyValueStore)
        self.sync = VoxoConversationSync(
            api: api, socket: VoxoSocket(config: config, session: urlSession), store: store, state: conversation, config: config)

        push = VoxoPushRegistrar(api: api, store: store, config: config, sessionId: { [unowned self] in self.conversation.sessionId })
        typing = VoxoTypingSender(
            isEligible: { [unowned self] in
                self.config.options.enableLiveTyping && self.chatbot.features.liveTypingPreview && self.handoff.isHandledByHuman
            },
            send: { [unowned self] in self.sync.sendTyping($0) })
        attachments = VoxoAttachmentQueue(
            api: api, config: config, compressor: imageCompressor,
            onChanged: { [unowned self] in self.publish() }, onError: { [unowned self] in self.reportError($0) })
        sender = VoxoMessageSender(
            api: api, config: config, state: conversation, rateLimiter: rateLimiter,
            onChanged: { [unowned self] in self.publish() }, onError: { [unowned self] in self.reportError($0) },
            onSessionReplaced: { [unowned self] in await self.adoptNewSession(previous: $0) },
            userId: { [unowned self] in self.userId })
        feedback = VoxoFeedbackService(
            api: api, config: config, state: conversation,
            onChanged: { [unowned self] in self.publish() }, onError: { [unowned self] in self.reportError($0) })
        realtime = VoxoRealtimeBinder(
            sync: sync, state: conversation,
            onChanged: { [unowned self] in self.publish() }, onError: { [unowned self] in self.reportError($0) },
            onHandoff: { [unowned self] in self.applyHandoff($0) },
            onConnectivity: { [unowned self] in self.applyConnectivity($0) },
            onSystemMessage: { [unowned self] in self.addAssistantMessage($0) },
            isActive: { [unowned self] in self.isOpen && !self.conversation.sessionEnded })
        composer = VoxoComposer(
            sender: sender, attachments: attachments, state: conversation, config: config,
            onChanged: { [unowned self] in self.publish() }, onError: { [unowned self] in self.reportError($0) },
            onActivity: { [unowned self] in self.realtime.touch(); self.realtime.resetReminders() },
            onPersist: { [unowned self] in await self.persist() },
            ensureOpenSession: { [unowned self] in await self.startNewSession() })
    }

    // MARK: - Cycle de vie

    /// Restaure la session, charge la config distante, ouvre le temps réel. Idempotent.
    public func start() async {
        if isReady || disposed { return }
        await sync.restoreLocale()
        userId = await sync.userId()
        let reminderCount = await sync.restore()

        let (loaded, initialConnectivity) = await sync.loadConfig()
        if disposed { return }
        chatbot = loaded
        connectivity = initialConnectivity
        attachments.applyServerLimits(maxFiles: loaded.maxAttachments, maxBytes: loaded.maxAttachmentBytes)

        if conversation.isEmpty { await addWelcomeMessage() }
        if disposed { return }

        realtime.start(reminderCount: reminderCount, enableInactivity: config.options.enableInactivityMonitor)
        // Le fil réel fait foi sur le restauré : un agent a pu répondre app fermée.
        Task { await realtime.refreshHistory() }

        await push.load()
        await push.syncSession()

        isReady = true
        publish()
    }

    /// À appeler quand l'écran de chat s'ouvre ou se ferme : l'inactivité ne court que s'il est ouvert.
    public func setOpen(_ open: Bool) {
        isOpen = open
        guard open else { return }
        realtime.touch()
        Task { await realtime.refreshConnectivity(force: true) }
    }

    public func notifyUserActivity() { realtime.touch() }

    public func setLocale(_ locale: String) {
        config.locale = VoxoI18n.normalize(locale)
        Task { await sync.saveLocale() }
        publish()
    }

    public func dispose() {
        disposed = true
        typing.cancel()
        realtime.dispose()
        observers.removeAll()
    }

    // MARK: - Actions

    public func sendMessage(_ text: String) async {
        typing.submit("") // efface l'aperçu chez le conseiller avant que le message n'arrive
        await composer.send(text)
    }

    public func retry(_ messageId: String) async { await composer.retry(messageId) }

    public func submitFeedback(_ message: VoxoMessage, _ value: VoxoFeedback) async {
        guard chatbot.features.messageFeedback else { return }
        await feedback.submitMessageFeedback(message, value)
        await persist()
    }

    /// Clôture avec note facultative (1-5) et commentaire ; `true` si le serveur l'a acceptée.
    public func endConversation(rating: Int? = nil, comment: String? = nil) async -> Bool {
        let closed = await feedback.endConversation(rating: rating, feedback: comment)
        if closed { await persist() }
        return closed
    }

    public func startNewSession() async {
        await sync.archive(sessionId: conversation.sessionId, messages: conversation.messages)
        conversation.reset()
        rateLimiter.reset()
        handoff = VoxoHandoff()
        realtime.reconnect()
        await addWelcomeMessage()
        await persist()
        await push.syncSession()
        publish()
    }

    public func history() async -> [VoxoArchivedConversation] { await sync.history() }

    /// Signale une erreur à l'utilisateur (affichée une fois par l'UI, puis acquittée).
    public func reportError(_ message: String) {
        lastError = message
        publish()
    }

    public func clearError() {
        guard lastError != nil else { return }
        lastError = nil
        publish()
    }

    // MARK: - Interne

    private func adoptNewSession(previous: String) async {
        await sync.archive(sessionId: previous, messages: conversation.messages)
        realtime.reconnect()
        await push.syncSession()
    }

    private func addWelcomeMessage() async {
        guard conversation.isEmpty else { return }
        let suggestions = await sync.quickReplies()
        guard !disposed, conversation.isEmpty else { return }
        conversation.add(VoxoMessage(role: .assistant, text: chatbot.welcomeMessage, suggestions: suggestions, isWelcome: true))
        publish()
    }

    private func addAssistantMessage(_ text: String) {
        conversation.add(VoxoMessage(role: .assistant, text: text))
        Task { await persist() }
        publish()
    }

    private func applyHandoff(_ value: VoxoHandoff) {
        handoff = value
        publish()
    }

    private func applyConnectivity(_ value: VoxoConnectivity) {
        guard connectivity != value else { return }
        connectivity = value
        publish()
    }

    private func persist() async { await sync.persist(reminderCount: realtime.reminderCount) }

    private func publish() {
        guard !disposed else { return }
        var next = VoxoUiState()
        next.messages = conversation.ordered
        next.chatbot = chatbot
        next.connectivity = connectivity
        next.handoff = handoff
        next.pendingAttachments = attachments.items
        next.sessionId = conversation.sessionId
        next.locale = config.locale
        next.isReady = isReady
        next.isLoading = composer.isSending
        next.isUploading = attachments.isUploading
        next.sessionEnded = conversation.sessionEnded
        next.canRate = chatbot.features.conversationRating && conversation.hasServerReply
        next.lastError = lastError
        state = next
        for handler in observers.values { handler(next) }
    }
}
