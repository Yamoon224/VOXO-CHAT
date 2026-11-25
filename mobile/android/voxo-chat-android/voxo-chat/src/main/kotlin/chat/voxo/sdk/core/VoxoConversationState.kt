package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoDeliveryStatus
import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoMessage
import java.time.Duration
import java.time.Instant

/** État de connectivité vers le backend, affiché dans l'en-tête. */
enum class VoxoConnectivity { CONNECTING, AVAILABLE, UNAVAILABLE }

/**
 * Source de vérité de la conversation courante. Pas de réseau, pas d'UI.
 * Accédé depuis un seul contexte (celui du controller) : pas de verrou.
 */
internal class VoxoConversationState(sessionId: String? = null) {
    var sessionId: String = sessionId ?: VoxoUuid.v4()
    val messages: MutableList<VoxoMessage> = mutableListOf()
    var messageCount = 0
    var conversationStartedAt: Instant? = null
    var sessionEnded = false

    /**
     * Fil trié. Dédoublonné par identifiant : un `id` répété (donnée serveur ou session restaurée
     * corrompue) ferait planter la liste de l'UI, qui s'en sert comme clé.
     */
    val ordered: List<VoxoMessage> get() = messages.distinctBy { it.id }.sortedBy { it.timestamp }

    val isEmpty: Boolean get() = messages.isEmpty()

    val hasServerReply: Boolean get() = messages.any { !it.isFromUser && it.serverId != null }

    val lastFailed: VoxoMessage? get() = messages.lastOrNull { it.isFromUser && it.hasFailed }

    val durationMs: Long?
        get() = conversationStartedAt?.let { Duration.between(it, Instant.now()).toMillis() }

    fun byId(id: String): VoxoMessage? = messages.firstOrNull { it.id == id }

    fun hasServerId(serverId: String?): Boolean =
        serverId != null && messages.any { it.serverId == serverId }

    fun add(message: VoxoMessage): VoxoMessage {
        messages.add(message)
        if (message.isFromUser && !message.isWelcome) messageCount++
        if (conversationStartedAt == null) conversationStartedAt = Instant.now()
        val overflow = messages.size - VoxoLimits.MAX_MESSAGES_IN_MEMORY
        if (overflow > 0) messages.subList(0, overflow).clear()
        return message
    }

    /** Applique [transform] au message [id] ; null si introuvable. */
    fun update(id: String, transform: (VoxoMessage) -> VoxoMessage): VoxoMessage? {
        val index = messages.indexOfFirst { it.id == id }
        if (index == -1) return null
        return transform(messages[index]).also { messages[index] = it }
    }

    fun setDelivery(id: String, status: VoxoDeliveryStatus, serverId: String? = null) {
        update(id) { it.copy(deliveryStatus = status, serverId = serverId ?: it.serverId) }
    }

    fun setFeedback(id: String, feedback: VoxoFeedback?) {
        update(id) { it.copy(feedback = feedback) }
    }

    /**
     * Le fil serveur fait foi, sauf pour les messages encore en vol (sans
     * `serverId`, non répondus) et pour l'accueil local quand l'historique est
     * vide : le serveur ne le renvoie pas et il doit rester en tête.
     */
    fun replaceWithHistory(history: List<VoxoMessage>) {
        val inFlight = messages.filter {
            it.serverId == null && !it.isWelcome && it.deliveryStatus != VoxoDeliveryStatus.ANSWERED
        }
        val welcome = messages.filter { it.isWelcome }
        messages.clear()
        if (history.isEmpty()) messages.addAll(welcome)
        messages.addAll(history)
        messages.addAll(inFlight)
    }

    fun reset(sessionId: String? = null) {
        this.sessionId = sessionId ?: VoxoUuid.v4()
        messages.clear()
        messageCount = 0
        conversationStartedAt = null
        sessionEnded = false
    }
}
