import Foundation

/// Envoi d'un message (`POST /widget/message`) : validation locale, affichage optimiste,
/// application de la réponse. Le `clientMessageId` est l'id local du message et ne change
/// jamais, retry compris : c'est lui qui porte l'idempotence.
@MainActor
final class VoxoMessageSender {
    private let api: VoxoApiClient
    private let config: VoxoConfig
    private let state: VoxoConversationState
    private let rateLimiter: VoxoRateLimiter
    private let onChanged: () -> Void
    private let onError: (String) -> Void
    /// Appelé quand le serveur a ouvert une nouvelle session : archiver l'ancienne, reconnecter le socket.
    private let onSessionReplaced: (String) async -> Void
    private let userId: () -> String

    init(
        api: VoxoApiClient,
        config: VoxoConfig,
        state: VoxoConversationState,
        rateLimiter: VoxoRateLimiter,
        onChanged: @escaping () -> Void,
        onError: @escaping (String) -> Void,
        onSessionReplaced: @escaping (String) async -> Void,
        userId: @escaping () -> String
    ) {
        self.api = api
        self.config = config
        self.state = state
        self.rateLimiter = rateLimiter
        self.onChanged = onChanged
        self.onError = onError
        self.onSessionReplaced = onSessionReplaced
        self.userId = userId
    }

    @discardableResult
    func send(
        text: String,
        attachmentIds: [String] = [],
        attachments: [VoxoPendingAttachment] = [],
        retryOf: VoxoMessage? = nil
    ) async -> Bool {
        if text.isEmpty && attachmentIds.isEmpty { return false }

        if text.count > VoxoLimits.maxMessageLength {
            onError(VoxoI18n.text(config.locale, "messageTooLong", ["max": VoxoLimits.maxMessageLength]))
            return false
        }
        // Un 429 serveur est transitoire ; ici on ne consomme un jeton que pour un vrai envoi.
        if !rateLimiter.tryConsume() {
            onError(VoxoI18n.text(config.locale, "tooManyMessages"))
            return false
        }

        let message = retryOf ?? appendUserMessage(text, attachments, attachmentIds)
        state.setDelivery(message.id, .sending)
        onChanged()

        do {
            let data = try await api.sendMessage(
                message: text,
                sessionId: state.sessionId,
                clientMessageId: message.id,
                userId: userId(),
                userName: config.user?.name,
                userEmail: config.user?.email,
                attachmentIds: attachmentIds,
                metadata: ["platform": "mobile", "sdk": "ios"]
            )
            await applyResponse(data, sent: message)
            return true
        } catch {
            state.setDelivery(message.id, .failed)
            onChanged()
            onError((error as? VoxoException)?.message ?? VoxoI18n.text(config.locale, "genericError"))
            return false
        }
    }

    private func appendUserMessage(_ text: String, _ attachments: [VoxoPendingAttachment], _ attachmentIds: [String]) -> VoxoMessage {
        state.add(VoxoMessage(
            role: .user,
            text: text,
            attachments: attachments.map {
                VoxoAttachment(id: $0.remoteId ?? $0.localId, name: $0.name, category: $0.category, size: $0.size)
            },
            deliveryStatus: .sending,
            pendingAttachmentIds: attachmentIds
        ))
    }

    private func applyResponse(_ data: JSONObject, sent: VoxoMessage) async {
        // Le serveur peut avoir basculé la conversation sur une nouvelle session.
        if let next = data.string("sessionId"), next != state.sessionId {
            let previous = state.sessionId
            state.sessionId = next
            await onSessionReplaced(previous)
        }

        state.setDelivery(sent.id, .answered, serverId: data.string("userMessageId") ?? sent.id)

        let assistantId = data.string("assistantMessageId")
        // Le socket a pu livrer la même réponse en parallèle : on ne l'ajoute qu'une fois.
        if let reply = data.string("response"), !reply.isEmpty, !state.hasServerId(assistantId) {
            state.add(VoxoMessage(
                id: assistantId ?? VoxoUUID.v4(),
                serverId: assistantId,
                role: .assistant,
                text: reply,
                suggestions: data.strings("suggestions")
            ))
        }
        onChanged()
    }
}
