#if canImport(SwiftUI)
import SwiftUI

/// Bouton flottant aux couleurs du chatbot. Ne gère pas la navigation : c'est à l'app hôte
/// d'afficher `VoxoChatView` dans `action` (plein écran, feuille, onglet…).
@MainActor
public struct VoxoLauncher: View {
    private let action: () -> Void
    private let customTheme: VoxoTheme?
    @StateObject private var observer: VoxoStateObserver
    @Environment(\.colorScheme) private var colorScheme

    public init(controller: VoxoController, theme: VoxoTheme? = nil, action: @escaping () -> Void) {
        self.action = action
        self.customTheme = theme
        _observer = StateObject(wrappedValue: VoxoStateObserver(controller))
    }

    private var ui: VoxoUiState { observer.state }

    private var theme: VoxoTheme {
        customTheme ?? VoxoTheme.fromConfig(ui.chatbot, systemDark: colorScheme == .dark)
    }

    public var body: some View {
        Button(action: action) {
            icon
                .frame(width: 56, height: 56)
                .background(theme.accent.color)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.25), radius: 6, y: 3)
        }
        .accessibilityLabel(VoxoI18n.text(ui.locale, "openChat"))
    }

    @ViewBuilder private var icon: some View {
        let fallback = Image(systemName: "bubble.left.fill").font(.system(size: 22)).foregroundColor(theme.onAccent.color)
        if let urlString = ui.chatbot.launcherIconUrl, let url = URL(string: urlString) {
            // Icône de marque : peut ne pas charger, on retombe sur l'icône par défaut.
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFill().frame(width: 26, height: 26).clipShape(Circle())
                } else {
                    fallback
                }
            }
        } else {
            fallback
        }
    }
}
#endif
