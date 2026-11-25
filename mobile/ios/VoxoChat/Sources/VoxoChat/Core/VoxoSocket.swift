import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Événement reçu sur le socket : voir « WebSocket » dans `mobile/CONTRACT.md`.
struct VoxoSocketEvent {
    let type: String?
    let handoff: VoxoHandoff?
    let message: JSONObject?

    var isSync: Bool { type == "conversation.sync" }
    var isAgentMessage: Bool { type == "message" && message?.string("role") == "agent" }

    static func fromJSON(_ json: JSONObject) -> VoxoSocketEvent {
        let handoff = json["handoff"] as? JSONObject
        return VoxoSocketEvent(
            type: json.string("type"),
            handoff: handoff.map(VoxoHandoff.fromJSON),
            message: json["message"] as? JSONObject
        )
    }
}

/// Flux temps réel d'une conversation. **Strictement descendant** : rien n'est jamais émis
/// vers le serveur, l'envoi passe par REST.
///
/// Toute terminaison (propre ou non) mène à une reconnexion en backoff exponentiel : un
/// refus d'autorisation détruit la connexion sans message. Une reconnexion programmée est
/// abandonnée si le `sessionId` a changé.
@MainActor
final class VoxoSocket {
    private let config: VoxoConfig
    private let session: URLSession
    private var task: URLSessionWebSocketTask?
    private var reconnectTask: Task<Void, Never>?
    private var sessionId: String?
    private var attempt = 0
    private var disposed = false
    private var generation = 0

    /// Appelé pour chaque événement décodé.
    var onEvent: ((VoxoSocketEvent) -> Void)?

    init(config: VoxoConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func connect(sessionId: String) {
        if disposed { return }
        if self.sessionId == sessionId, task != nil { return }
        self.sessionId = sessionId
        attempt = 0
        open()
    }

    /// Seule trame montante du socket : l'aperçu de saisie (voir CONTRACT.md). `false` si aucun socket n'est
    /// ouvert ; l'envoi lui-même est au mieux (un texte perdu n'est pas rejoué).
    @discardableResult
    func sendTyping(_ text: String) -> Bool {
        guard let task, task.state == .running else { return false }
        task.send(.string(encodeJSON(["type": "typing", "text": text]))) { _ in }
        return true
    }

    func disconnect() {
        reconnectTask?.cancel()
        sessionId = nil
        closeSocket()
    }

    func dispose() {
        disposed = true
        disconnect()
    }

    private func open() {
        reconnectTask?.cancel()
        closeSocket()
        guard !disposed, let target = sessionId,
              let url = config.conversationSocketURL(sessionId: target) else { return }
        generation += 1
        let current = generation
        let socket = session.webSocketTask(with: url)
        task = socket
        socket.resume()
        receive(on: socket, target: target, generation: current)
    }

    private func receive(on socket: URLSessionWebSocketTask, target: String, generation: Int) {
        socket.receive { [weak self] result in
            Task { @MainActor in
                guard let self, generation == self.generation else { return }
                switch result {
                case .success(let message):
                    self.handle(message, target: target)
                    self.receive(on: socket, target: target, generation: generation)
                case .failure:
                    self.scheduleReconnect(target: target)
                }
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message, target: String) {
        guard target == sessionId else { return }
        attempt = 0
        var payload: String?
        switch message {
        case .string(let text): payload = text
        case .data(let data): payload = String(data: data, encoding: .utf8)
        @unknown default: break
        }
        // Charge illisible : on l'ignore plutôt que de rompre le flux.
        guard let decoded = decodeJSONObject(payload) else { return }
        onEvent?(VoxoSocketEvent.fromJSON(decoded))
    }

    private func scheduleReconnect(target: String) {
        closeSocket()
        guard !disposed, target == sessionId else { return }
        let wait = VoxoLimits.reconnectDelay(attempt: attempt)
        attempt += 1
        reconnectTask?.cancel()
        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                guard let self, target == self.sessionId else { return }
                self.open()
            }
        }
    }

    private func closeSocket() {
        generation += 1 // invalide les callbacks du socket qu'on abandonne
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }
}
