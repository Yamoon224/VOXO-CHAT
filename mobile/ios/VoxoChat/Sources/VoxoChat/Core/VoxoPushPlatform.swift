import Foundation

/// Service de notification qui a émis le jeton confié à `VoxoController.registerPushToken`.
public enum VoxoPushPlatform: String {
    /// Firebase Cloud Messaging.
    case fcm
    /// Apple Push Notification service.
    case apns
}

/// Conversation archivée rouverte en **lecture seule** (voir CONTRACT.md, « Conversations archivées »).
public struct VoxoArchivedView: Equatable {
    public let messages: [VoxoMessage]
    public let handoff: VoxoHandoff
}
