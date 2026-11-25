package chat.voxo.sdk.core

/** Service de notification qui a émis le jeton confié à [VoxoController.registerPushToken]. */
enum class VoxoPushPlatform {
    /** Firebase Cloud Messaging (Android). */
    FCM,

    /** Apple Push Notification service. */
    APNS;

    internal val wireName: String get() = name.lowercase()
}

/** Conversation archivée rouverte en **lecture seule** (voir CONTRACT.md, « Conversations archivées »). */
data class VoxoArchivedView(
    val messages: List<chat.voxo.sdk.models.VoxoMessage>,
    val handoff: chat.voxo.sdk.models.VoxoHandoff,
)
