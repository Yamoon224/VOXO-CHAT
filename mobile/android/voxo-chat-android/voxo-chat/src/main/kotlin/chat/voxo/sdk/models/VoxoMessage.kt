package chat.voxo.sdk.models

import chat.voxo.sdk.core.VoxoUuid
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.time.Instant

/** Auteur d'un message. `internal_note` n'est jamais exposé au widget. */
enum class VoxoRole {
    USER, ASSISTANT, AGENT;

    internal val wireName: String get() = name.lowercase()

    internal companion object {
        fun fromApi(value: String?) = when (value) {
            "user" -> USER
            "agent" -> AGENT
            else -> ASSISTANT
        }
    }
}

/** Progression de l'envoi d'un message utilisateur. */
enum class VoxoDeliveryStatus {
    SENDING, ANSWERED, FAILED;

    internal val wireName: String get() = name.lowercase()

    internal companion object {
        fun fromWire(value: String?) = entries.firstOrNull { it.wireName == value }
    }
}

/** Avis exprimé sur une réponse. */
enum class VoxoFeedback {
    UP, DOWN;

    internal val wireName: String get() = name.lowercase()

    internal companion object {
        fun fromWire(value: String?) = entries.firstOrNull { it.wireName == value }
    }
}

/**
 * Un message du fil. [id] est l'identifiant **local** (UUID v4, aussi utilisé
 * comme `clientMessageId`) ; [serverId] n'existe qu'une fois le message accepté
 * et reste le seul utilisable pour le feedback.
 *
 * Immuable : l'état exposé ne contient que des copies.
 */
data class VoxoMessage(
    val id: String = VoxoUuid.v4(),
    val serverId: String? = null,
    val role: VoxoRole,
    val text: String,
    val timestamp: Instant = Instant.now(),
    val suggestions: List<String> = emptyList(),
    val attachments: List<VoxoAttachment> = emptyList(),
    val deliveryStatus: VoxoDeliveryStatus? = null,
    val feedback: VoxoFeedback? = null,
    val messageIndex: Int? = null,
    /** Accueil produit localement : jamais envoyé au serveur. */
    val isWelcome: Boolean = false,
    /** Identifiants serveur des pièces déjà envoyées, pour réessayer sans re-téléverser. */
    val pendingAttachmentIds: List<String> = emptyList(),
) {
    val isFromUser: Boolean get() = role == VoxoRole.USER
    val hasFailed: Boolean get() = deliveryStatus == VoxoDeliveryStatus.FAILED
    val canReceiveFeedback: Boolean
        get() = role != VoxoRole.USER && (serverId != null || messageIndex != null)

    internal fun toJson(): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(id))
        put("serverId", serverId?.let(::JsonPrimitive) ?: JsonNull)
        put("role", JsonPrimitive(role.wireName))
        put("text", JsonPrimitive(text))
        put("timestamp", JsonPrimitive(timestamp.toString()))
        put("suggestions", JsonArray(suggestions.map(::JsonPrimitive)))
        put("attachments", JsonArray(attachments.map { it.toJson() }))
        put("deliveryStatus", deliveryStatus?.let { JsonPrimitive(it.wireName) } ?: JsonNull)
        put("feedback", feedback?.let { JsonPrimitive(it.wireName) } ?: JsonNull)
        put("messageIndex", messageIndex?.let(::JsonPrimitive) ?: JsonNull)
        put("isWelcome", JsonPrimitive(isWelcome))
        put("pendingAttachmentIds", JsonArray(pendingAttachmentIds.map(::JsonPrimitive)))
    }

    internal companion object {
        /** Message tel que le renvoie `GET /widget/conversation/:sessionId` ou le socket. */
        fun fromHistory(json: JsonObject): VoxoMessage {
            val role = VoxoRole.fromApi(json.string("role"))
            return VoxoMessage(
                id = json.string("id") ?: VoxoUuid.v4(),
                serverId = json.string("id"),
                role = role,
                text = json.string("content") ?: "",
                timestamp = parseInstant(json.string("timestamp")) ?: Instant.now(),
                attachments = json.objects("attachments").map(VoxoAttachment::fromJson),
                feedback = VoxoFeedback.fromWire(json.string("feedback")),
                messageIndex = json.int("messageIndex"),
                deliveryStatus = if (role == VoxoRole.USER) VoxoDeliveryStatus.ANSWERED else null,
            )
        }

        fun fromJson(json: JsonObject) = VoxoMessage(
            id = json.string("id") ?: VoxoUuid.v4(),
            serverId = json.string("serverId"),
            role = VoxoRole.fromApi(json.string("role")),
            text = json.string("text") ?: "",
            timestamp = parseInstant(json.string("timestamp")) ?: Instant.now(),
            suggestions = json.strings("suggestions"),
            attachments = json.objects("attachments").map(VoxoAttachment::fromJson),
            deliveryStatus = VoxoDeliveryStatus.fromWire(json.string("deliveryStatus")),
            feedback = VoxoFeedback.fromWire(json.string("feedback")),
            messageIndex = json.int("messageIndex"),
            isWelcome = json.bool("isWelcome") ?: false,
            pendingAttachmentIds = json.strings("pendingAttachmentIds"),
        )

        fun parseInstant(value: String?): Instant? =
            value?.let { runCatching { Instant.parse(it) }.getOrNull() }
    }
}
