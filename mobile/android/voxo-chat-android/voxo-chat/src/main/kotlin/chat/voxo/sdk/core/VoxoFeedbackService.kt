package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoMessage

/** Pouce haut/bas par message, et clôture avec notation. */
internal class VoxoFeedbackService(
    private val api: VoxoApiClient,
    private val config: VoxoConfig,
    private val state: VoxoConversationState,
    private val onChanged: () -> Unit,
    private val onError: (String) -> Unit,
) {
    /** Re-toucher le même avis le retire. Optimiste, annulé si le serveur refuse. */
    suspend fun submitMessageFeedback(message: VoxoMessage, value: VoxoFeedback) {
        if (!message.canReceiveFeedback) return

        val previous = message.feedback
        val next = if (previous == value) null else value
        state.setFeedback(message.id, next)
        onChanged()

        try {
            api.sendMessageFeedback(
                state.sessionId,
                messageId = message.serverId,
                // Le rang ne sert que si le serveur n'a pas encore attribué d'id.
                messageIndex = if (message.serverId == null) message.messageIndex else null,
                value = next?.wireName,
            )
        } catch (_: VoxoException) {
            state.setFeedback(message.id, previous)
            onChanged()
            onError(VoxoI18n.text(config.locale, "feedbackSaveFailed"))
        }
    }

    suspend fun endConversation(rating: Int?, feedback: String?): Boolean = try {
        api.endConversation(state.sessionId, rating, feedback, state.durationMs, state.messageCount)
        state.sessionEnded = true
        onChanged()
        true
    } catch (error: VoxoException) {
        onError(error.message)
        false
    }
}
