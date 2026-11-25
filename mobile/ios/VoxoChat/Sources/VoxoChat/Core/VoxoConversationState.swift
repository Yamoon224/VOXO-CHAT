import Foundation

/// État de connectivité vers le backend, affiché dans l'en-tête.
public enum VoxoConnectivity {
    case connecting, available, unavailable
}

/// Source de vérité de la conversation courante. Pas de réseau, pas d'UI. Accédé depuis le
/// seul acteur principal : pas de verrou.
@MainActor
final class VoxoConversationState {
    var sessionId: String
    var messages: [VoxoMessage] = []
    var messageCount = 0
    var conversationStartedAt: Date?
    var sessionEnded = false

    init(sessionId: String? = nil) {
        self.sessionId = sessionId ?? VoxoUUID.v4()
    }

    /// Fil trié, dédoublonné par identifiant : un `id` répété ferait planter (ou corrompre) les listes de
    /// l'UI, qui s'en servent comme clé.
    var ordered: [VoxoMessage] { uniqueByID(messages).enumerated().sorted { lhs, rhs in
        // Tri stable : à horodatage égal, l'ordre d'arrivée fait foi.
        lhs.element.timestamp == rhs.element.timestamp ? lhs.offset < rhs.offset : lhs.element.timestamp < rhs.element.timestamp
    }.map { $0.element } }

    private func uniqueByID(_ list: [VoxoMessage]) -> [VoxoMessage] {
        var seen = Set<String>()
        return list.filter { seen.insert($0.id).inserted }
    }

    var isEmpty: Bool { messages.isEmpty }
    var hasServerReply: Bool { messages.contains { !$0.isFromUser && $0.serverId != nil } }
    var lastFailed: VoxoMessage? { messages.last { $0.isFromUser && $0.hasFailed } }

    var durationMs: Int64? {
        conversationStartedAt.map { Int64(Date().timeIntervalSince($0) * 1000) }
    }

    func byId(_ id: String) -> VoxoMessage? { messages.first { $0.id == id } }

    func hasServerId(_ serverId: String?) -> Bool {
        guard let serverId else { return false }
        return messages.contains { $0.serverId == serverId }
    }

    @discardableResult
    func add(_ message: VoxoMessage) -> VoxoMessage {
        messages.append(message)
        if message.isFromUser && !message.isWelcome { messageCount += 1 }
        if conversationStartedAt == nil { conversationStartedAt = Date() }
        let overflow = messages.count - VoxoLimits.maxMessagesInMemory
        if overflow > 0 { messages.removeFirst(overflow) }
        return message
    }

    /// Applique `transform` au message `id` ; nil si introuvable.
    @discardableResult
    func update(_ id: String, _ transform: (inout VoxoMessage) -> Void) -> VoxoMessage? {
        guard let index = messages.firstIndex(where: { $0.id == id }) else { return nil }
        transform(&messages[index])
        return messages[index]
    }

    func setDelivery(_ id: String, _ status: VoxoDeliveryStatus, serverId: String? = nil) {
        update(id) {
            $0.deliveryStatus = status
            if let serverId { $0.serverId = serverId }
        }
    }

    func setFeedback(_ id: String, _ feedback: VoxoFeedback?) {
        update(id) { $0.feedback = feedback }
    }

    /// Le fil serveur fait foi, sauf pour les messages encore en vol (sans `serverId`, non
    /// répondus) et pour l'accueil local quand l'historique est vide : le serveur ne le
    /// renvoie pas et il doit rester en tête.
    func replaceWithHistory(_ history: [VoxoMessage]) {
        let inFlight = messages.filter { $0.serverId == nil && !$0.isWelcome && $0.deliveryStatus != .answered }
        let welcome = messages.filter { $0.isWelcome }
        messages = (history.isEmpty ? welcome : []) + history + inFlight
    }

    func reset(sessionId: String? = nil) {
        self.sessionId = sessionId ?? VoxoUUID.v4()
        messages.removeAll()
        messageCount = 0
        conversationStartedAt = nil
        sessionEnded = false
    }
}
