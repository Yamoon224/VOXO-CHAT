package chat.voxo.sdk.core

import chat.voxo.sdk.models.asObject
import chat.voxo.sdk.models.string
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull

/**
 * Décodage de l'enveloppe uniforme du backend widget. C'est le **seul** point de
 * parsing d'enveloppe du SDK : ni l'UI ni le controller ne réinterprètent un
 * corps de réponse brut.
 */
internal object VoxoEnvelope {
    /** Renvoie `data`, ou lève une [VoxoException] portant le message du serveur. */
    fun unwrap(statusCode: Int, body: String, locale: String = "fr"): JsonObject {
        val decoded = decode(body)

        if (decoded == null) {
            if (statusCode >= 400) {
                throw VoxoException(fallbackMessage(statusCode, locale), "HTTP_$statusCode", statusCode)
            }
            throw VoxoException.malformedResponse(locale)
        }

        if ((decoded["success"] as? JsonPrimitive)?.booleanOrNull == true) {
            return decoded["data"].asObject() ?: JsonObject(emptyMap())
        }

        val error = decoded.string("error")
        throw VoxoException(
            message = if (!error.isNullOrEmpty()) error else fallbackMessage(statusCode, locale),
            code = decoded.string("code"),
            statusCode = statusCode,
        )
    }

    private fun decode(body: String): JsonObject? {
        if (body.isEmpty()) return null
        return runCatching { Json.parseToJsonElement(body) }.getOrNull().asObject()
    }

    /** Filet de sécurité : un intermédiaire (proxy, passerelle) a répondu à la place du backend. */
    private fun fallbackMessage(statusCode: Int, locale: String): String = when {
        statusCode == 429 -> VoxoI18n.text(locale, "rateLimited")
        statusCode == 404 -> VoxoI18n.text(locale, "notFound")
        statusCode >= 500 -> VoxoI18n.text(locale, "unavailable")
        else -> VoxoI18n.text(locale, "genericError")
    }
}

internal val voxoJson = Json { ignoreUnknownKeys = true }
