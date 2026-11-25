package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoAttachment
import chat.voxo.sdk.models.VoxoDeliveryStatus
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.VoxoPendingAttachment
import chat.voxo.sdk.models.VoxoRole
import chat.voxo.sdk.models.string
import chat.voxo.sdk.models.strings
import kotlinx.serialization.json.JsonObject

/**
 * Envoi d'un message (`POST /widget/message`) : validation locale, affichage
 * optimiste, application de la réponse. Le `clientMessageId` est l'id local du
 * message et ne change jamais, retry compris : c'est lui qui porte l'idempotence.
 */
internal class VoxoMessageSender(
    private val api: VoxoApiClient,
    private val config: VoxoConfig,
    private val state: VoxoConversationState,
    private val rateLimiter: VoxoRateLimiter,
    private val onChanged: () -> Unit,
    private val onError: (String) -> Unit,
    /** Appelé quand le serveur a ouvert une nouvelle session : archiver l'ancienne, reconnecter le socket. */
    private val onSessionReplaced: suspend (previousSessionId: String) -> Unit,
    private val userId: () -> String,
) {
    suspend fun send(
        text: String,
        attachmentIds: List<String> = emptyList(),
        attachments: List<VoxoPendingAttachment> = emptyList(),
        retryOf: VoxoMessage? = null,
    ): Boolean {
        if (text.isEmpty() && attachmentIds.isEmpty()) return false

        if (text.length > VoxoLimits.MAX_MESSAGE_LENGTH) {
            onError(VoxoI18n.text(config.locale, "messageTooLong", mapOf("max" to VoxoLimits.MAX_MESSAGE_LENGTH)))
            return false
        }
        // Un 429 serveur est transitoire ; ici on ne consomme un jeton que pour un vrai envoi.
        if (!rateLimiter.tryConsume()) {
            onError(VoxoI18n.text(config.locale, "tooManyMessages"))
            return false
        }

        val message = retryOf ?: appendUserMessage(text, attachments, attachmentIds)
        state.setDelivery(message.id, VoxoDeliveryStatus.SENDING)
        onChanged()

        return try {
            val data = api.sendMessage(
                message = text,
                sessionId = state.sessionId,
                clientMessageId = message.id,
                userId = userId(),
                userName = config.user?.name,
                userEmail = config.user?.email,
                attachmentIds = attachmentIds,
                metadata = mapOf("platform" to "mobile", "sdk" to "android"),
            )
            applyResponse(data, message)
            true
        } catch (error: VoxoException) {
            state.setDelivery(message.id, VoxoDeliveryStatus.FAILED)
            onChanged()
            onError(error.message)
            false
        }
    }

    private fun appendUserMessage(
        text: String,
        attachments: List<VoxoPendingAttachment>,
        attachmentIds: List<String>,
    ): VoxoMessage = state.add(
        VoxoMessage(
            role = VoxoRole.USER,
            text = text,
            deliveryStatus = VoxoDeliveryStatus.SENDING,
            pendingAttachmentIds = attachmentIds,
            attachments = attachments.map {
                VoxoAttachment(it.remoteId ?: it.localId, it.name, it.category, size = it.size)
            },
        ),
    )

    private suspend fun applyResponse(data: JsonObject, sent: VoxoMessage) {
        // Le serveur peut avoir basculé la conversation sur une nouvelle session.
        val nextSessionId = data.string("sessionId")
        if (nextSessionId != null && nextSessionId != state.sessionId) {
            val previous = state.sessionId
            state.sessionId = nextSessionId
            onSessionReplaced(previous)
        }

        state.setDelivery(sent.id, VoxoDeliveryStatus.ANSWERED, data.string("userMessageId") ?: sent.id)

        val assistantId = data.string("assistantMessageId")
        val reply = data.string("response")
        // Le socket a pu livrer la même réponse en parallèle : on ne l'ajoute qu'une fois.
        if (!reply.isNullOrEmpty() && !state.hasServerId(assistantId)) {
            state.add(
                VoxoMessage(
                    id = assistantId ?: chat.voxo.sdk.core.VoxoUuid.v4(),
                    serverId = assistantId,
                    role = VoxoRole.ASSISTANT,
                    text = reply,
                    suggestions = data.strings("suggestions"),
                ),
            )
        }
        onChanged()
    }
}
