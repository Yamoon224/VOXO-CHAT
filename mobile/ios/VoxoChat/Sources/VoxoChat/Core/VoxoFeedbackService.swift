import Foundation

/// Pouce haut/bas par message, et clôture avec notation.
@MainActor
final class VoxoFeedbackService {
    private let api: VoxoApiClient
    private let config: VoxoConfig
    private let state: VoxoConversationState
    private let onChanged: () -> Void
    private let onError: (String) -> Void

    init(
        api: VoxoApiClient,
        config: VoxoConfig,
        state: VoxoConversationState,
        onChanged: @escaping () -> Void,
        onError: @escaping (String) -> Void
    ) {
        self.api = api
        self.config = config
        self.state = state
        self.onChanged = onChanged
        self.onError = onError
    }

    /// Re-toucher le même avis le retire. Optimiste, annulé si le serveur refuse.
    func submitMessageFeedback(_ message: VoxoMessage, _ value: VoxoFeedback) async {
        guard message.canReceiveFeedback else { return }

        let previous = message.feedback
        let next: VoxoFeedback? = previous == value ? nil : value
        state.setFeedback(message.id, next)
        onChanged()

        do {
            _ = try await api.sendMessageFeedback(
                sessionId: state.sessionId,
                messageId: message.serverId,
                // Le rang ne sert que si le serveur n'a pas encore attribué d'id.
                messageIndex: message.serverId == nil ? message.messageIndex : nil,
                value: next?.rawValue
            )
        } catch {
            state.setFeedback(message.id, previous)
            onChanged()
            onError(VoxoI18n.text(config.locale, "feedbackSaveFailed"))
        }
    }

    func endConversation(rating: Int?, feedback: String?) async -> Bool {
        do {
            _ = try await api.endConversation(
                sessionId: state.sessionId, rating: rating, feedback: feedback,
                sessionDurationMs: state.durationMs, messageCount: state.messageCount)
            state.sessionEnded = true
            onChanged()
            return true
        } catch {
            onError((error as? VoxoException)?.message ?? VoxoI18n.text(config.locale, "genericError"))
            return false
        }
    }
}
