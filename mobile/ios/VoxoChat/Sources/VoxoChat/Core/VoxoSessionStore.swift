import Foundation

/// Conversation terminée, conservée localement 30 jours (30 au plus).
public struct VoxoArchivedConversation: Equatable {
    public let sessionId: String
    public let title: String
    public let endedAt: Date

    func toJSON() -> JSONObject {
        ["sessionId": sessionId, "title": title, "endedAt": VoxoDates.format(endedAt)]
    }

    static func fromJSON(_ json: JSONObject) -> VoxoArchivedConversation {
        VoxoArchivedConversation(
            sessionId: json.string("sessionId") ?? "",
            title: json.string("title") ?? "Conversation",
            endedAt: VoxoDates.parse(json.string("endedAt")) ?? Date()
        )
    }
}

/// Session restaurée au démarrage.
struct VoxoSessionSnapshot {
    let sessionId: String
    let messages: [VoxoMessage]
    let messageCount: Int
    let inactivityReminderCount: Int
    let sessionEnded: Bool
    let conversationStartedAt: Date?
}

/// Persistance de la session et de l'historique local. Clés suffixées par le `tenantId` :
/// plusieurs chatbots peuvent cohabiter dans une même application.
final class VoxoSessionStore {
    private let config: VoxoConfig
    private let store: VoxoKeyValueStore
    private let clock: () -> Date

    init(config: VoxoConfig, store: VoxoKeyValueStore, clock: @escaping () -> Date = Date.init) {
        self.config = config
        self.store = store
        self.clock = clock
    }

    private var sessionKey: String { "session-\(config.tenantId)" }
    private var historyKey: String { "conversation-history-\(config.tenantId)" }
    private var localeKey: String { "locale-\(config.tenantId)" }
    private var pushKey: String { "push-token-\(config.tenantId)" }
    private let userIdKey = "user-id"

    func userId() async -> String {
        if let external = config.user?.externalId, !external.isEmpty { return external }
        if let existing = await store.getString(userIdKey), !existing.isEmpty { return existing }
        let generated = "user-\(VoxoUUID.v4())"
        await store.putString(userIdKey, generated)
        return generated
    }

    func savedLocale() async -> String? {
        guard let value = await store.getString(localeKey), value == "fr" || value == "en" else { return nil }
        return value
    }

    func saveLocale(_ locale: String) async { await store.putString(localeKey, locale) }

    /// Dernier jeton de notification confié par l'app hôte : permet de le relier à chaque nouvelle session.
    func savePushToken(platform: VoxoPushPlatform, token: String) async {
        await store.putString(pushKey, encodeJSON(["platform": platform.rawValue, "token": token]))
    }

    func loadPushToken() async -> (VoxoPushPlatform, String)? {
        guard let json = decodeJSONObject(await store.getString(pushKey)),
              let platform = json.string("platform").flatMap(VoxoPushPlatform.init(rawValue:)),
              let token = json.string("token"), !token.isEmpty else { return nil }
        return (platform, token)
    }

    func clearPushToken() async { await store.remove(pushKey) }

    @MainActor
    func save(_ state: VoxoConversationState, reminderCount: Int) async {
        guard config.options.persistSession else { return }
        // Seuls les derniers messages sont persistés : au-delà, le fil se recharge du serveur.
        let kept = Array(state.messages.suffix(VoxoLimits.maxPersistedMessages))
        var json: JSONObject = [
            "sessionId": state.sessionId,
            "messages": kept.map { $0.toJSON() },
            "lastActivity": Int64(clock().timeIntervalSince1970 * 1000),
            "messageCount": state.messageCount,
            "inactivityReminderCount": reminderCount,
            "sessionEnded": state.sessionEnded,
        ]
        if let started = state.conversationStartedAt { json["conversationStartedAt"] = VoxoDates.format(started) }
        await store.putString(sessionKey, encodeJSON(json))
    }

    /// nil si rien à restaurer ; une session inactive depuis 30 min est archivée, pas restaurée.
    func restore() async -> VoxoSessionSnapshot? {
        guard config.options.persistSession,
              let decoded = decodeJSONObject(await store.getString(sessionKey)),
              let lastActivity = decoded.int64("lastActivity") else { return nil }

        let messages = decoded.objects("messages").map(VoxoMessage.fromJSON)
        let age = clock().timeIntervalSince1970 * 1000 - Double(lastActivity)
        if age >= VoxoLimits.sessionTimeout * 1000 {
            await archive(sessionId: decoded.string("sessionId"), messages: messages)
            await store.remove(sessionKey)
            return nil
        }
        return VoxoSessionSnapshot(
            sessionId: decoded.string("sessionId") ?? VoxoUUID.v4(),
            messages: messages,
            messageCount: decoded.int("messageCount") ?? 0,
            inactivityReminderCount: decoded.int("inactivityReminderCount") ?? 0,
            sessionEnded: decoded.bool("sessionEnded") ?? false,
            conversationStartedAt: VoxoDates.parse(decoded.string("conversationStartedAt"))
        )
    }

    func archive(sessionId: String?, messages: [VoxoMessage]) async {
        guard let sessionId, !sessionId.isEmpty, !messages.isEmpty else { return }
        // Le premier message de l'utilisateur sert de titre, comme dans le widget.
        let title = messages.first { $0.isFromUser && !$0.text.isEmpty }?.text ?? "Conversation"
        var entries = await history().filter { $0.sessionId != sessionId }
        entries.insert(VoxoArchivedConversation(sessionId: sessionId, title: String(title.prefix(80)), endedAt: clock()), at: 0)
        let kept = entries.prefix(VoxoLimits.maxArchivedConversations).map { $0.toJSON() }
        await store.putString(historyKey, encodeJSON(Array(kept)))
    }

    func history() async -> [VoxoArchivedConversation] {
        guard let raw = await store.getString(historyKey),
              let data = raw.data(using: .utf8),
              let list = (try? JSONSerialization.jsonObject(with: data)) as? [Any] else { return [] }
        let cutoff = clock().addingTimeInterval(-VoxoLimits.historyRetention)
        return list.compactMap { $0 as? JSONObject }
            .map(VoxoArchivedConversation.fromJSON)
            .filter { $0.endedAt > cutoff }
    }
}
