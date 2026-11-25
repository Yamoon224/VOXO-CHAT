import Foundation

/// Relie le socket, l'historique et l'inactivité à l'état de la conversation. Reçoit les
/// événements descendants ; n'envoie jamais rien sur le socket.
@MainActor
final class VoxoRealtimeBinder {
    private let sync: VoxoConversationSync
    private let state: VoxoConversationState
    private let onChanged: () -> Void
    private let onError: (String) -> Void
    private let onHandoff: (VoxoHandoff) -> Void
    private let onConnectivity: (VoxoConnectivity) -> Void
    private let onSystemMessage: (String) -> Void
    private let isActive: () -> Bool
    private var inactivity: VoxoInactivityMonitor?

    init(
        sync: VoxoConversationSync,
        state: VoxoConversationState,
        onChanged: @escaping () -> Void,
        onError: @escaping (String) -> Void,
        onHandoff: @escaping (VoxoHandoff) -> Void,
        onConnectivity: @escaping (VoxoConnectivity) -> Void,
        onSystemMessage: @escaping (String) -> Void,
        isActive: @escaping () -> Bool
    ) {
        self.sync = sync
        self.state = state
        self.onChanged = onChanged
        self.onError = onError
        self.onHandoff = onHandoff
        self.onConnectivity = onConnectivity
        self.onSystemMessage = onSystemMessage
        self.isActive = isActive
    }

    var reminderCount: Int { inactivity?.reminderCount ?? 0 }

    func start(reminderCount: Int = 0, enableInactivity: Bool = true) {
        sync.setEventHandler { [weak self] event in
            guard let self else { return }
            Task { @MainActor in await self.onEvent(event) }
        }
        sync.connectSocket()
        guard enableInactivity else { return }

        let monitor = inactivity ?? makeMonitor()
        inactivity = monitor
        monitor.start(reminderCount: reminderCount)
    }

    private func makeMonitor() -> VoxoInactivityMonitor {
        VoxoInactivityMonitor(
            onReminder: { [weak self] in
                guard let self else { return }
                self.onSystemMessage(VoxoI18n.text(self.sync.config.locale, "inactivityReminder"))
            },
            onClosing: { [weak self] in
                guard let self else { return }
                self.onSystemMessage(VoxoI18n.text(self.sync.config.locale, "inactivityClosing"))
            },
            onTimeout: { [weak self] in await self?.closeForInactivity() },
            isActive: isActive
        )
    }

    func touch() { inactivity?.touch() }

    func resetReminders() { inactivity?.resetReminders() }

    func reconnect() {
        sync.connectSocket()
        inactivity?.resetReminders()
    }

    private func onEvent(_ event: VoxoSocketEvent) async {
        if let handoff = event.handoff { onHandoff(handoff) }

        // Le fil a bougé hors de notre vue : on le recharge plutôt que de fusionner.
        if event.isSync {
            await refreshHistory()
            return
        }
        guard event.isAgentMessage, let raw = event.message else { return }

        let message = VoxoMessage.fromHistory(raw)
        // Un même message peut arriver deux fois : reconnexion, resynchronisation.
        if state.hasServerId(message.serverId) { return }
        state.add(message)
        onChanged()
    }

    func refreshHistory() async {
        do {
            if let handoff = try await sync.syncHistory() { onHandoff(handoff) }
            onChanged()
        } catch {
            onError((error as? VoxoException)?.message ?? VoxoI18n.text(sync.config.locale, "genericError"))
        }
    }

    private func closeForInactivity() async {
        do {
            try await sync.endForInactivity()
            state.sessionEnded = true
            await sync.archive(sessionId: state.sessionId, messages: state.messages)
            onChanged()
        } catch {
            onError(VoxoI18n.text(sync.config.locale, "autoCloseFailed"))
        }
    }

    func refreshConnectivity(force: Bool = false) async {
        if let result = await sync.checkConnectivity(force: force) { onConnectivity(result) }
    }

    func dispose() {
        inactivity?.stop()
        sync.disposeSocket()
    }
}
