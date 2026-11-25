import Foundation

/// Fonctionnalités activées par le propriétaire du chatbot depuis son dashboard.
public struct VoxoFeatures: Equatable {
    public var messageFeedback = true
    public var conversationRating = true
    public var showTimestamps = true
    public var showDeliveryStatus = true
    public var dateSeparators = true
    public var connectivityStatus = true
    public var attachments = true
    /// Le propriétaire autorise l'aperçu de saisie (désactivé par défaut côté serveur).
    public var liveTypingPreview = false

    public init() {}

    static func fromJSON(_ json: JSONObject) -> VoxoFeatures {
        var features = VoxoFeatures()
        features.messageFeedback = json.bool("messageFeedback") ?? true
        features.conversationRating = json.bool("conversationRating") ?? true
        features.showTimestamps = json.bool("showTimestamps") ?? true
        features.showDeliveryStatus = json.bool("showDeliveryStatus") ?? true
        features.dateSeparators = json.bool("dateSeparators") ?? true
        features.connectivityStatus = json.bool("connectivityStatus") ?? true
        features.attachments = json.bool("attachments") ?? true
        features.liveTypingPreview = json.bool("liveTypingPreview") ?? false
        return features
    }
}

/// Configuration distante (`GET /widget/config`). Toutes les clés de `options.ui` sont
/// optionnelles : aucune ne doit être présumée présente.
public struct VoxoChatbotConfig: Equatable {
    public var name = "Assistant"
    public var welcomeMessage = VoxoI18n.text("fr", "defaultWelcome")
    public var primaryColor = "#3b82f6"
    public var textColor = "#333333"
    public var avatarUrl: String?
    public var launcherIconUrl: String?
    /// `light` ou `dark` si le propriétaire a forcé un mode ; nil = thème de l'app hôte.
    public var colorScheme: String?
    public var enableMarkdown = true
    public var showPoweredBy = true
    public var features = VoxoFeatures()
    public var maxAttachments = VoxoLimits.maxAttachmentsPerMessage
    public var maxAttachmentBytes = VoxoLimits.maxFileBytes

    public init() {}

    static func fromJSON(_ json: JSONObject, locale: String = "fr") -> VoxoChatbotConfig {
        let theme = json.object("theme")
        let options = json.object("options")
        let ui = options.object("ui")
        let attachments = options.object("attachments")

        var config = VoxoChatbotConfig()
        config.name = json.string("name") ?? "Assistant"
        config.welcomeMessage = json.string("welcomeMessage") ?? VoxoI18n.text(locale, "defaultWelcome")
        config.primaryColor = theme.string("primaryColor") ?? "#3b82f6"
        config.textColor = theme.string("textColor") ?? "#333333"
        config.avatarUrl = ui.string("avatarUrl")
        config.launcherIconUrl = ui.string("launcherIconUrl")
        config.colorScheme = ui.string("colorScheme")
        config.enableMarkdown = options.bool("enableMarkdown") ?? true
        config.showPoweredBy = !(json.object("features").bool("customBranding") ?? false)
        config.features = VoxoFeatures.fromJSON(options.object("features"))
        config.maxAttachments = attachments.int("maxFiles") ?? VoxoLimits.maxAttachmentsPerMessage
        config.maxAttachmentBytes = attachments.int64("maxBytes") ?? VoxoLimits.maxFileBytes
        return config
    }
}
