import Foundation

/// Relances puis clôture automatique après un silence prolongé : 10 min, 3 rappels (deux
/// relances, une annonce de clôture) puis `/timeout`.
@MainActor
final class VoxoInactivityMonitor {
    private let onReminder: () -> Void
    private let onClosing: () -> Void
    private let onTimeout: () async -> Void
    private let isActive: () -> Bool
    private let delay: TimeInterval
    private let maxReminders: Int
    private let tickInterval: TimeInterval
    private let clock: () -> TimeInterval

    private var loop: Task<Void, Never>?
    private var lastActivity: TimeInterval
    private(set) var reminderCount = 0

    init(
        onReminder: @escaping () -> Void,
        onClosing: @escaping () -> Void,
        onTimeout: @escaping () async -> Void,
        isActive: @escaping () -> Bool,
        delay: TimeInterval = VoxoLimits.inactivityDelay,
        maxReminders: Int = VoxoLimits.maxInactivityReminders,
        tickInterval: TimeInterval = VoxoLimits.inactivityTick,
        clock: @escaping () -> TimeInterval = { Date().timeIntervalSince1970 }
    ) {
        self.onReminder = onReminder
        self.onClosing = onClosing
        self.onTimeout = onTimeout
        self.isActive = isActive
        self.delay = delay
        self.maxReminders = maxReminders
        self.tickInterval = tickInterval
        self.clock = clock
        self.lastActivity = clock()
    }

    func start(reminderCount: Int = 0) {
        self.reminderCount = reminderCount
        touch()
        loop?.cancel()
        loop = Task { [weak self] in
            while !Task.isCancelled {
                guard let interval = self?.tickInterval else { return }
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                if Task.isCancelled { return }
                await self?.tick()
            }
        }
    }

    func touch() { lastActivity = clock() }

    func resetReminders() { reminderCount = 0 }

    func tick() async {
        guard isActive(), clock() - lastActivity > delay else { return }

        // Les premières échéances relancent l'utilisateur.
        if reminderCount < maxReminders - 1 {
            reminderCount += 1
            onReminder()
            touch()
            return
        }
        // L'avant-dernière annonce la clôture, qui suit immédiatement.
        if reminderCount == maxReminders - 1 {
            reminderCount += 1
            onClosing()
            touch()
        }
        await onTimeout()
    }

    func stop() {
        loop?.cancel()
        loop = nil
    }
}
