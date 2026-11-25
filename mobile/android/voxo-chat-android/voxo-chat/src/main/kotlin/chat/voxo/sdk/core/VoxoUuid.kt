package chat.voxo.sdk.core

import java.security.SecureRandom

/**
 * Génération et validation d'UUID v4. Le backend **rejette** tout
 * `clientMessageId` qui n'est pas un UUID v4 strict : c'est ce champ qui porte
 * l'idempotence.
 */
object VoxoUuid {
    private val random = SecureRandom()

    private val pattern = Regex(
        "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        RegexOption.IGNORE_CASE,
    )

    fun v4(): String {
        val bytes = ByteArray(16).also(random::nextBytes)
        bytes[6] = ((bytes[6].toInt() and 0x0f) or 0x40).toByte() // version 4
        bytes[8] = ((bytes[8].toInt() and 0x3f) or 0x80).toByte() // variante RFC 4122
        val hex = bytes.joinToString("") { "%02x".format(it) }
        return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-" +
            "${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
    }

    fun isValid(value: String?): Boolean = value != null && pattern.matches(value)
}
