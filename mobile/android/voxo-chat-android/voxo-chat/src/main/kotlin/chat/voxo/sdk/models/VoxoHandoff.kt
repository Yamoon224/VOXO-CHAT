package chat.voxo.sdk.models

import chat.voxo.sdk.core.VoxoI18n
import kotlinx.serialization.json.JsonObject

/** État de la reprise de la conversation par un humain. */
enum class VoxoHandoffStatus {
    NONE, WAITING, HUMAN;

    internal companion object {
        fun fromApi(value: String?) = when (value) {
            "waiting" -> WAITING
            "human" -> HUMAN
            else -> NONE
        }
    }
}

/** Reprise humaine, telle qu'elle arrive par le WebSocket ou l'historique. */
data class VoxoHandoff(
    val status: VoxoHandoffStatus = VoxoHandoffStatus.NONE,
    val agentName: String? = null,
    val reason: String? = null,
) {
    val isHandledByHuman: Boolean get() = status == VoxoHandoffStatus.HUMAN

    /** Sous-titre localisé de l'en-tête ; null quand l'assistant répond seul. */
    fun labelFor(locale: String): String? = when (status) {
        VoxoHandoffStatus.HUMAN -> VoxoI18n.text(
            locale, "handoffWithAgent",
            mapOf("agent" to (agentName ?: VoxoI18n.text(locale, "handoffDefaultAgent"))),
        )
        VoxoHandoffStatus.WAITING -> VoxoI18n.text(locale, "handoffWaiting")
        VoxoHandoffStatus.NONE -> null
    }

    internal companion object {
        fun fromJson(json: JsonObject) = VoxoHandoff(
            status = VoxoHandoffStatus.fromApi(json.string("status") ?: json.string("handoffStatus")),
            agentName = json["assignedAgent"].asObject()?.string("name"),
            reason = json.string("reason") ?: json.string("handoffReason"),
        )
    }
}
