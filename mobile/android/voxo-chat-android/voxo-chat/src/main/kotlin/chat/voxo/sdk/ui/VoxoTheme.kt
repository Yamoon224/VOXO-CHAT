package chat.voxo.sdk.ui

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.lerp
import chat.voxo.sdk.models.VoxoChatbotConfig

/** Couleurs lues depuis la config distante (`#rgb`, `#rrggbb`, `#aarrggbb`). */
internal object VoxoColor {
    fun parse(value: String?): Color? {
        val input = value?.trim()?.removePrefix("#").orEmpty()
        val normalized = when (input.length) {
            3 -> "ff" + input.map { "$it$it" }.joinToString("")
            6 -> "ff$input"
            8 -> input
            else -> return null
        }
        return normalized.toLongOrNull(16)?.let { Color(it.toInt()) }
    }

    fun parseOr(value: String?, fallback: Color): Color = parse(value) ?: fallback

    fun onColor(background: Color): Color =
        if (background.luminance() > 0.5f) Color(0xff111827) else Color.White

    fun mix(color: Color, towards: Color, amount: Float): Color = lerp(color, towards, amount.coerceIn(0f, 1f))
}

/**
 * Palette de l'écran de chat. Dérivée de la config distante par défaut ; une
 * app hôte peut en fournir une sur mesure à [VoxoChatView].
 */
data class VoxoTheme(
    val accent: Color,
    val onAccent: Color,
    val surface: Color,
    val surfaceMuted: Color,
    val border: Color,
    val text: Color,
    val textMuted: Color,
    val userBubble: Color,
    val onUserBubble: Color,
    val botBubble: Color,
    val onBotBubble: Color,
    /** Teinte d'accent très diluée : distingue un conseiller humain de l'assistant. */
    val agentBubble: Color,
    val danger: Color,
    val isDark: Boolean,
    val cornerRadiusDp: Int = 16,
) {
    companion object {
        private val defaultAccent = Color(0xff3b82f6)

        /** [systemDark] sert quand le propriétaire n'a pas forcé de mode. */
        fun fromConfig(config: VoxoChatbotConfig, systemDark: Boolean = false): VoxoTheme {
            val accent = VoxoColor.parseOr(config.primaryColor, defaultAccent)
            val dark = when (config.colorScheme) {
                "dark" -> true
                "light" -> false
                else -> systemDark
            }
            return if (dark) dark(accent) else light(accent, config)
        }

        private fun light(accent: Color, config: VoxoChatbotConfig) = VoxoTheme(
            accent = accent,
            onAccent = VoxoColor.onColor(accent),
            surface = Color.White,
            surfaceMuted = Color(0xfff3f4f6),
            border = Color(0xffe5e7eb),
            text = VoxoColor.parseOr(config.textColor, Color(0xff111827)),
            textMuted = Color(0xff6b7280),
            userBubble = accent,
            onUserBubble = VoxoColor.onColor(accent),
            botBubble = Color(0xfff3f4f6),
            onBotBubble = Color(0xff111827),
            agentBubble = VoxoColor.mix(accent, Color.White, 0.88f),
            danger = Color(0xffdc2626),
            isDark = false,
        )

        private fun dark(accent: Color) = VoxoTheme(
            accent = accent,
            onAccent = VoxoColor.onColor(accent),
            surface = Color(0xff111827),
            surfaceMuted = Color(0xff1f2937),
            border = Color(0xff374151),
            text = Color(0xfff9fafb),
            textMuted = Color(0xff9ca3af),
            userBubble = accent,
            onUserBubble = VoxoColor.onColor(accent),
            botBubble = Color(0xff1f2937),
            onBotBubble = Color(0xfff9fafb),
            agentBubble = VoxoColor.mix(accent, Color(0xff111827), 0.75f),
            danger = Color(0xfff87171),
            isDark = true,
        )
    }
}

internal val LocalVoxoTheme = staticCompositionLocalOf<VoxoTheme> { error("Aucun VoxoTheme fourni.") }
