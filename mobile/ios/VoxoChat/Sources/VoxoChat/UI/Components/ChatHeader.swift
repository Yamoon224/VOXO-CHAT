#if canImport(SwiftUI)
import SwiftUI

/// En-tête : avatar, nom, statut (conseiller ou connectivité), actions.
struct VoxoChatHeader: View {
    let config: VoxoChatbotConfig
    let connectivity: VoxoConnectivity
    let handoff: VoxoHandoff
    let canRate: Bool
    let locale: String
    let theme: VoxoTheme
    let onRate: () -> Void
    let onNewConversation: () -> Void
    let onHistory: () -> Void
    let onClose: (() -> Void)?
    let onLocaleChange: ((String) -> Void)?

    var body: some View {
        HStack(spacing: 10) {
            avatar
            VStack(alignment: .leading, spacing: 2) {
                Text(config.name).font(.system(size: 16, weight: .semibold)).lineLimit(1)
                Text(subtitle).font(.system(size: 12)).opacity(0.8).lineLimit(1)
            }
            .foregroundColor(theme.onAccent.color)
            Spacer(minLength: 4)
            if canRate { action("★", VoxoI18n.text(locale, "endAndRateTooltip"), onRate) }
            overflowMenu
            if let onClose { action("✕", VoxoI18n.text(locale, "closeChatTooltip"), onClose) }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(theme.accent.color)
    }

    /// Actions secondaires regroupées : l'en-tête garde la place d'afficher le nom et le statut en entier.
    private var overflowMenu: some View {
        Menu {
            Button(VoxoI18n.text(locale, "historyTitle"), action: onHistory)
            Button(VoxoI18n.text(locale, "newConversationTooltip"), action: onNewConversation)
            if let onLocaleChange {
                let other = locale == "en" ? "fr" : "en"
                Button("\(VoxoI18n.text(locale, "languageLabel")) : \(other.uppercased())") { onLocaleChange(other) }
            }
        } label: {
            Text("⋮").font(.system(size: 22, weight: .bold)).foregroundColor(theme.onAccent.color)
                .frame(minWidth: 36, minHeight: 44)
        }
        .accessibilityLabel(VoxoI18n.text(locale, "moreActions"))
    }

    private func action(_ glyph: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(glyph).font(.system(size: 16, weight: .bold)).foregroundColor(theme.onAccent.color)
                .frame(minWidth: 36, minHeight: 44)
        }
        .accessibilityLabel(label)
    }

    @ViewBuilder private var avatar: some View {
        let initial = Text(String(config.name.first ?? "?").uppercased())
            .font(.system(size: 16, weight: .bold)).foregroundColor(theme.onAccent.color)
            .frame(width: 36, height: 36)
            .background(theme.onAccent.color.opacity(0.2)).clipShape(Circle())
        if let urlString = config.avatarUrl, let url = URL(string: urlString) {
            // Une URL d'avatar peut ne pas charger : on retombe sur l'initiale.
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFill().frame(width: 36, height: 36).clipShape(Circle())
                } else {
                    initial
                }
            }
        } else {
            initial
        }
    }

    private var subtitle: String {
        if let label = handoff.label(for: locale) { return label }
        guard config.features.connectivityStatus else { return VoxoI18n.text(locale, "assistantOnlyStatus") }
        switch connectivity {
        case .available: return VoxoI18n.text(locale, "assistantAvailable")
        case .unavailable: return VoxoI18n.text(locale, "serviceUnavailable")
        case .connecting: return VoxoI18n.text(locale, "connectingStatus")
        }
    }
}
#endif
