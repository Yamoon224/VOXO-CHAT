import Foundation

/// Aperçu de saisie : limite la cadence des trames `typing` (une toutes les 200 ms au plus, le serveur ignore
/// le reste) et garantit que la **dernière** valeur arrive, y compris la chaîne vide qui efface l'aperçu chez
/// le conseiller. N'envoie rien tant que `isEligible` est faux — fonction activée par le propriétaire ET prise en
/// charge humaine : c'est une donnée personnelle sensible.
@MainActor
final class VoxoTypingSender {
    static let maxTextLength = 500
    static let minInterval: TimeInterval = 0.2

    private let clock: () -> TimeInterval
    private let isEligible: () -> Bool
    private let send: (String) -> Bool
    private let minInterval: TimeInterval

    private var lastSentAt = -TimeInterval.infinity
    private var lastText = ""
    private var latest = ""
    private var pending: Task<Void, Never>?

    init(
        clock: @escaping () -> TimeInterval = { Date().timeIntervalSince1970 },
        minInterval: TimeInterval = VoxoTypingSender.minInterval,
        isEligible: @escaping () -> Bool,
        send: @escaping (String) -> Bool
    ) {
        self.clock = clock
        self.minInterval = minInterval
        self.isEligible = isEligible
        self.send = send
    }

    func submit(_ text: String) {
        latest = String(text.prefix(Self.maxTextLength))
        guard isEligible(), latest != lastText else { return }
        let wait = minInterval - (clock() - lastSentAt)
        if wait <= 0 {
            flush()
        } else if pending == nil {
            pending = Task { [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
                guard !Task.isCancelled else { return }
                self?.flush()
            }
        }
    }

    private func flush() {
        pending = nil
        guard isEligible(), latest != lastText else { return }
        // Une trame non envoyée n'est pas comptée comme envoyée : la prochaine modification réessaie.
        if send(latest) {
            lastText = latest
            lastSentAt = clock()
        }
    }

    func cancel() {
        pending?.cancel()
        pending = nil
    }
}
