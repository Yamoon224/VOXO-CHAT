import Foundation

/// Orchestration de la synchronisation : config distante, historique, session locale,
/// connectivité. Regroupe ce qui touche au serveur ET au stockage pour que le controller
/// n'ait qu'un interlocuteur.
@MainActor
final class VoxoConversationSync {
    private let api: VoxoApiClient
    private let socket: VoxoSocket
    private let store: VoxoSessionStore
    private let state: VoxoConversationState
    let config: VoxoConfig
    private let clock: () -> Date
    private var lastHealthCheck: Date?

    init(
        api: VoxoApiClient,
        socket: VoxoSocket,
        store: VoxoSessionStore,
        state: VoxoConversationState,
        config: VoxoConfig,
        clock: @escaping () -> Date = Date.init
    ) {
        self.api = api
        self.socket = socket
        self.store = store
        self.state = state
        self.config = config
        self.clock = clock
    }

    func setEventHandler(_ handler: @escaping (VoxoSocketEvent) -> Void) { socket.onEvent = handler }

    func connectSocket() { socket.connect(sessionId: state.sessionId) }

    func sendTyping(_ text: String) -> Bool { socket.sendTyping(text) }

    func disposeSocket() { socket.dispose() }

    func userId() async -> String { await store.userId() }

    func restoreLocale() async {
        if let saved = await store.savedLocale() { config.locale = saved }
    }

    func saveLocale() async { await store.saveLocale(config.locale) }

    /// Restaure la session locale ; renvoie le nombre de relances d'inactivité déjà faites.
    func restore() async -> Int {
        guard let snapshot = await store.restore() else { return 0 }
        state.sessionId = snapshot.sessionId
        state.messages = snapshot.messages
        state.messageCount = snapshot.messageCount
        state.conversationStartedAt = snapshot.conversationStartedAt
        state.sessionEnded = snapshot.sessionEnded
        return snapshot.inactivityReminderCount
    }

    /// Une panne de config ne bloque pas le chat : valeurs par défaut + service indisponible.
    func loadConfig() async -> (VoxoChatbotConfig, VoxoConnectivity) {
        do {
            let data = try await api.getConfig()
            let parsed: VoxoChatbotConfig
            if let chatbot = data["chatbot"] as? JSONObject {
                parsed = VoxoChatbotConfig.fromJSON(chatbot, locale: config.locale)
            } else {
                parsed = fallbackConfig()
            }
            return (parsed, .available)
        } catch {
            return (fallbackConfig(), .unavailable)
        }
    }

    private func fallbackConfig() -> VoxoChatbotConfig {
        var fallback = VoxoChatbotConfig()
        fallback.welcomeMessage = VoxoI18n.text(config.locale, "defaultWelcome")
        return fallback
    }

    func quickReplies() async -> [String] {
        (try? await api.getQuickReplies())?.strings("suggestions") ?? []
    }

    /// Recharge l'historique. `404` = session neuve : pas d'historique, pas d'erreur (renvoie
    /// nil). Les autres erreurs remontent.
    func syncHistory() async throws -> VoxoHandoff? {
        do {
            let data = try await api.getConversation(sessionId: state.sessionId)
            if data["messages"] != nil {
                state.replaceWithHistory(data.objects("messages").map(VoxoMessage.fromHistory))
            }
            return VoxoHandoff.fromJSON(data)
        } catch let error as VoxoException where error.isNotFound {
            return nil
        }
    }

    /// Relit une conversation archivée **sans toucher** à la session active. Une conversation purgée côté
    /// serveur (404) devient « Historique indisponible », jamais une erreur technique. Dédoublonnée par id :
    /// l'UI s'en sert comme clé de liste.
    func loadArchived(sessionId: String) async throws -> VoxoArchivedView {
        do {
            let data = try await api.getConversation(sessionId: sessionId, limit: 100)
            var seen = Set<String>()
            let messages = data.objects("messages").map(VoxoMessage.fromHistory).filter { seen.insert($0.id).inserted }
            return VoxoArchivedView(messages: messages, handoff: VoxoHandoff.fromJSON(data))
        } catch let error as VoxoException where error.isNotFound {
            throw VoxoException(VoxoI18n.text(config.locale, "historyUnavailable"), code: "HISTORY_UNAVAILABLE", statusCode: 404)
        }
    }

    func persist(reminderCount: Int) async { await store.save(state, reminderCount: reminderCount) }

    func archive(sessionId: String, messages: [VoxoMessage]) async {
        await store.archive(sessionId: sessionId, messages: messages)
    }

    func history() async -> [VoxoArchivedConversation] { await store.history() }

    func endForInactivity() async throws {
        _ = try await api.endConversationForInactivity(
            sessionId: state.sessionId, sessionDurationMs: state.durationMs, messageCount: state.messageCount)
    }

    /// nil si une sonde récente rend celle-ci inutile (~1 appel/minute maximum).
    func checkConnectivity(force: Bool = false) async -> VoxoConnectivity? {
        let now = clock()
        if !force, let last = lastHealthCheck, now.timeIntervalSince(last) < VoxoLimits.healthCheckInterval { return nil }
        lastHealthCheck = now
        return await api.isHealthy() ? .available : .unavailable
    }
}
