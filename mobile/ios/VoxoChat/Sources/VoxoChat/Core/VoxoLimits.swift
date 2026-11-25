import Foundation

/// Miroir client des limites du backend widget (voir `mobile/CONTRACT.md`). Ce ne sont
/// pas des inventions du SDK : toute révision se reporte dans CONTRACT.md et dans les
/// quatre SDK.
public enum VoxoLimits {
    public static let maxMessageLength = 2000
    public static let maxAttachmentsPerMessage = 3
    public static let maxFeedbackLength = 1000
    public static let maxFileBytes: Int64 = 10 * 1024 * 1024
    public static let messagesPerMinute = 15
    public static let rateLimitWindow: TimeInterval = 60

    public static let requestTimeout: TimeInterval = 30
    public static let uploadTimeout: TimeInterval = 120
    public static let healthTimeout: TimeInterval = 10

    public static let inactivityDelay: TimeInterval = 10 * 60
    public static let maxInactivityReminders = 3
    public static let inactivityTick: TimeInterval = 60

    public static let sessionTimeout: TimeInterval = 30 * 60

    public static let maxMessagesInMemory = 100
    public static let maxPersistedMessages = 50

    public static let historyRetention: TimeInterval = 30 * 24 * 3600
    public static let maxArchivedConversations = 30

    public static let socketReconnectBase: TimeInterval = 1
    public static let socketReconnectMax: TimeInterval = 15

    public static let healthCheckInterval: TimeInterval = 55

    /// Délai de reconnexion du socket pour la tentative `attempt` (0-indexée) :
    /// `min(1000 × 2^tentative, 15000)` ms.
    public static func reconnectDelay(attempt: Int) -> TimeInterval {
        let exponent = min(max(attempt, 0), 20)
        return min(socketReconnectBase * Double(1 << exponent), socketReconnectMax)
    }
}
