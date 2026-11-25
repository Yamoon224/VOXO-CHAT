import Foundation

@MainActor
extension VoxoController {
    /// Appelle `handler` à chaque nouvel état (et une première fois tout de suite). Renvoie
    /// un jeton à passer à `removeObserver`.
    @discardableResult
    public func observe(_ handler: @escaping (VoxoUiState) -> Void) -> UUID {
        let token = UUID()
        observers[token] = handler
        handler(state)
        return token
    }

    public func removeObserver(_ token: UUID) { observers.removeValue(forKey: token) }

    /// Variante `AsyncSequence` de `observe`, pour une UI sur mesure.
    public var stateStream: AsyncStream<VoxoUiState> {
        AsyncStream { continuation in
            let token = observe { continuation.yield($0) }
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor in self?.removeObserver(token) }
            }
        }
    }
}
