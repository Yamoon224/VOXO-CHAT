package chat.voxo.sdk.core

/** Textes du SDK, en français (défaut) et en anglais. */
object VoxoI18n {
    /** Ne retient que `fr` ou `en` ; toute autre valeur retombe sur `fr`. */
    fun normalize(locale: String?): String = if (locale?.lowercase() == "en") "en" else "fr"

    fun text(locale: String, key: String, values: Map<String, Any> = emptyMap()): String {
        val catalog = if (normalize(locale) == "en") VOXO_CATALOG_EN else VOXO_CATALOG_FR
        var result = catalog[key] ?: VOXO_CATALOG_FR[key] ?: key
        for ((name, value) in values) result = result.replace("{$name}", value.toString())
        return result
    }

    internal val catalogsHaveParity: Boolean
        get() = VOXO_CATALOG_FR.keys == VOXO_CATALOG_EN.keys
}
