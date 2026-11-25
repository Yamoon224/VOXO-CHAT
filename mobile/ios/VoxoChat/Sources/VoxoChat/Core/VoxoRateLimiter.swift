import Foundation

/// Fenêtre glissante côté client, miroir du rate limit serveur. Sert à éviter un
/// aller-retour perdu d'avance. Un `429` reste possible malgré une fenêtre locale vide
/// (le rate limit serveur est indexé sur l'IP) : condition transitoire.
final class VoxoRateLimiter {
    private let maxMessages: Int
    private let window: TimeInterval
    private let clock: () -> TimeInterval
    private var timestamps: [TimeInterval] = []

    init(
        maxMessages: Int = VoxoLimits.messagesPerMinute,
        window: TimeInterval = VoxoLimits.rateLimitWindow,
        clock: @escaping () -> TimeInterval = { Date().timeIntervalSince1970 }
    ) {
        self.maxMessages = maxMessages
        self.window = window
        self.clock = clock
    }

    /// Consomme un jeton. `false` si la fenêtre est pleine ; rien n'est alors consommé.
    func tryConsume() -> Bool {
        prune()
        guard timestamps.count < maxMessages else { return false }
        timestamps.append(clock())
        return true
    }

    /// Délai avant qu'un jeton se libère ; zéro si un envoi est possible.
    func cooldown() -> TimeInterval {
        prune()
        guard timestamps.count >= maxMessages, let first = timestamps.first else { return 0 }
        return max(0, window - (clock() - first))
    }

    func reset() { timestamps.removeAll() }

    private func prune() {
        let threshold = clock() - window
        timestamps.removeAll { $0 <= threshold }
    }
}
