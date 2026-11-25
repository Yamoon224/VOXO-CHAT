package chat.voxo.sdk.core

/**
 * Erreur remontée par le SDK. [message] est **toujours** destiné à l'utilisateur
 * final : quand l'erreur vient du serveur, c'est le champ `error` de l'enveloppe
 * relayé tel quel. Le SDK ne compose un message que pour ce que le serveur ne
 * peut pas dire (réseau, délai, validation locale).
 */
class VoxoException(
    override val message: String,
    /** Code métier du backend, ou code local (`NETWORK_UNAVAILABLE`, `TIMEOUT`, `INVALID_CONFIG`). */
    val code: String? = null,
    /** Statut HTTP quand l'erreur vient d'une réponse. */
    val statusCode: Int? = null,
) : Exception(message) {

    /** Condition transitoire : jamais de renvoi automatique en boucle. */
    val isRateLimited: Boolean get() = code == "RATE_LIMIT_EXCEEDED" || statusCode == 429

    val isQuotaExceeded: Boolean get() = code == "QUOTA_EXCEEDED"

    /** Sur `GET /widget/conversation/:sessionId` : cas normal d'une session neuve. */
    val isNotFound: Boolean get() = statusCode == 404

    val isTransport: Boolean get() = code == "NETWORK_UNAVAILABLE" || code == "TIMEOUT"

    override fun toString(): String = "VoxoException(${code ?: "-"}): $message"

    companion object {
        fun network(locale: String = "fr") =
            VoxoException(VoxoI18n.text(locale, "network"), code = "NETWORK_UNAVAILABLE")

        fun timeout(locale: String = "fr") =
            VoxoException(VoxoI18n.text(locale, "timeout"), code = "TIMEOUT")

        fun malformedResponse(locale: String = "fr") =
            VoxoException(VoxoI18n.text(locale, "malformed"), code = "MALFORMED_RESPONSE")
    }
}
