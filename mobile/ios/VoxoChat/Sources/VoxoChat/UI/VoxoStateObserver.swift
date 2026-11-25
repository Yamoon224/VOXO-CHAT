#if canImport(SwiftUI)
import SwiftUI

extension VoxoRGBA {
    var color: Color { Color(.sRGB, red: red, green: green, blue: blue, opacity: alpha) }
}

/// Pont entre le core (sans SwiftUI) et l'UI : republie `VoxoController.state` en
/// `ObservableObject`. L'UI fournie s'en sert ; une UI sur mesure peut faire de même ou
/// utiliser `stateStream`.
@MainActor
final class VoxoStateObserver: ObservableObject {
    @Published private(set) var state: VoxoUiState
    private var token: UUID?
    private weak var controller: VoxoController?

    init(_ controller: VoxoController) {
        self.controller = controller
        self.state = controller.state
        token = controller.observe { [weak self] next in self?.state = next }
    }

    deinit {
        // `deinit` n'est pas isolé : le désabonnement repart sur l'acteur principal.
        if let token, let controller {
            Task { @MainActor in controller.removeObserver(token) }
        }
    }
}
#endif
