package chat.voxo.sdk.ui.markdown

import java.net.URI

/**
 * Filtre des liens affichés dans les messages : seuls `http`, `https`, `mailto`
 * et `tel` s'ouvrent. Un chemin absolu (accepté par le widget web, relatif à son
 * site) n'a aucune cible dans une application : refusé.
 */
internal object VoxoSafeUrl {
    private val allowedSchemes = setOf("http", "https", "mailto", "tel")
    private val controlCharacters = Regex("[\\u0000-\\u001f\\u007f]")
    private val trailingPunctuation = Regex("[),.!?;:]+$")

    fun sanitize(value: String?): String? {
        val input = value?.trim().orEmpty()
        if (input.isEmpty() || controlCharacters.containsMatchIn(input) || input.startsWith("/")) return null
        val scheme = runCatching { URI(input).scheme }.getOrNull() ?: return null
        return if (scheme.lowercase() in allowedSchemes) input else null
    }

    /** Sépare la ponctuation finale d'une URL nue : elle n'en fait pas partie. */
    fun splitTrailingPunctuation(value: String): Pair<String, String> {
        val trailing = trailingPunctuation.find(value)?.value.orEmpty()
        return value.dropLast(trailing.length) to trailing
    }
}
