package chat.voxo.sdk.models

import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.core.VoxoLimits
import kotlinx.serialization.json.JsonObject

/** Fonctionnalités activées par le propriétaire du chatbot depuis son dashboard. */
data class VoxoFeatures(
    val messageFeedback: Boolean = true,
    val conversationRating: Boolean = true,
    val showTimestamps: Boolean = true,
    val showDeliveryStatus: Boolean = true,
    val dateSeparators: Boolean = true,
    val connectivityStatus: Boolean = true,
    val attachments: Boolean = true,
    /** Le propriétaire autorise l'aperçu de saisie (désactivé par défaut côté serveur). */
    val liveTypingPreview: Boolean = false,
) {
    internal companion object {
        fun fromJson(json: JsonObject) = VoxoFeatures(
            messageFeedback = json.bool("messageFeedback") ?: true,
            conversationRating = json.bool("conversationRating") ?: true,
            showTimestamps = json.bool("showTimestamps") ?: true,
            showDeliveryStatus = json.bool("showDeliveryStatus") ?: true,
            dateSeparators = json.bool("dateSeparators") ?: true,
            connectivityStatus = json.bool("connectivityStatus") ?: true,
            attachments = json.bool("attachments") ?: true,
            liveTypingPreview = json.bool("liveTypingPreview") ?: false,
        )
    }
}

/**
 * Configuration distante (`GET /widget/config`). Toutes les clés de `options.ui`
 * sont optionnelles : aucune ne doit être présumée présente.
 */
data class VoxoChatbotConfig(
    val name: String = "Assistant",
    val welcomeMessage: String = VoxoI18n.text("fr", "defaultWelcome"),
    val primaryColor: String = "#3b82f6",
    val textColor: String = "#333333",
    val avatarUrl: String? = null,
    val launcherIconUrl: String? = null,
    /** `light` ou `dark` si le propriétaire a forcé un mode ; null = thème de l'app hôte. */
    val colorScheme: String? = null,
    val enableMarkdown: Boolean = true,
    val showPoweredBy: Boolean = true,
    val features: VoxoFeatures = VoxoFeatures(),
    val maxAttachments: Int = VoxoLimits.MAX_ATTACHMENTS_PER_MESSAGE,
    val maxAttachmentBytes: Long = VoxoLimits.MAX_FILE_BYTES,
) {
    internal companion object {
        fun fromJson(json: JsonObject, locale: String = "fr"): VoxoChatbotConfig {
            val theme = json.obj("theme")
            val options = json.obj("options")
            val ui = options.obj("ui")
            val attachments = options.obj("attachments")
            return VoxoChatbotConfig(
                name = json.string("name") ?: "Assistant",
                welcomeMessage = json.string("welcomeMessage") ?: VoxoI18n.text(locale, "defaultWelcome"),
                primaryColor = theme.string("primaryColor") ?: "#3b82f6",
                textColor = theme.string("textColor") ?: "#333333",
                avatarUrl = ui.string("avatarUrl"),
                launcherIconUrl = ui.string("launcherIconUrl"),
                colorScheme = ui.string("colorScheme"),
                enableMarkdown = options.bool("enableMarkdown") ?: true,
                showPoweredBy = !(json.obj("features").bool("customBranding") ?: false),
                features = VoxoFeatures.fromJson(options.obj("features")),
                maxAttachments = attachments.int("maxFiles") ?: VoxoLimits.MAX_ATTACHMENTS_PER_MESSAGE,
                maxAttachmentBytes = attachments.long("maxBytes") ?: VoxoLimits.MAX_FILE_BYTES,
            )
        }
    }
}
