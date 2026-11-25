#if canImport(SwiftUI)
import SwiftUI

/// Historique local des conversations terminées, puis transcription **en lecture seule** de celle qu'on
/// touche : ni composeur, ni retour, ni avis. La session active n'est jamais modifiée.
struct VoxoHistoryScreen: View {
    let controller: VoxoController
    let chatbot: VoxoChatbotConfig
    let locale: String
    let theme: VoxoTheme
    let onBack: () -> Void

    private enum Transcript {
        case loading
        case loaded(VoxoArchivedView)
        case failed(String)
    }

    @State private var archives: [VoxoArchivedConversation]?
    @State private var opened: VoxoArchivedConversation?
    @State private var transcript: Transcript = .loading

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if let opened { transcriptView.id(opened.sessionId) } else { archiveList }
        }
        .background(theme.surface.color.ignoresSafeArea())
        // Le champ de saisie du chat garde sinon le focus, et son clavier reste ouvert par-dessus la liste.
        .task {
            UIKitKeyboard.dismiss()
            archives = await controller.history()
        }
    }

    private var topBar: some View {
        HStack(spacing: 8) {
            Button(action: back) {
                Text("←").font(.system(size: 22)).foregroundColor(theme.onAccent.color).frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel(VoxoI18n.text(locale, "backLabel"))
            Text(opened?.title ?? VoxoI18n.text(locale, "historyTitle"))
                .font(.system(size: 16, weight: .semibold)).foregroundColor(theme.onAccent.color).lineLimit(1)
            Spacer()
        }
        .padding(.horizontal, 8)
        .background(theme.accent.color)
    }

    /// Retour : de la transcription vers la liste, puis de la liste vers le chat.
    private func back() { if opened != nil { opened = nil } else { onBack() } }

    @ViewBuilder private var archiveList: some View {
        if let archives {
            if archives.isEmpty {
                centered(Text(VoxoI18n.text(locale, "noHistory")).foregroundColor(theme.textMuted.color))
            } else {
                List(archives, id: \.sessionId) { item in
                    Button(action: { open(item) }) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title).font(.system(size: 15)).foregroundColor(theme.text.color).lineLimit(2)
                            Text(VoxoDateLabels.daySeparator(item.endedAt, locale: locale))
                                .font(.system(size: 12)).foregroundColor(theme.textMuted.color)
                        }
                    }
                    .listRowBackground(theme.surface.color)
                }
                .listStyle(.plain)
            }
        } else {
            centered(ProgressView().tint(theme.accent.color))
        }
    }

    @ViewBuilder private var transcriptView: some View {
        switch transcript {
        case .loading:
            centered(ProgressView().tint(theme.accent.color))
        case .failed(let message):
            centered(Text(message).foregroundColor(theme.danger.color).padding(24))
        case .loaded(let view):
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(view.messages) { message in
                        VoxoMessageBubble(
                            message: message, features: readOnlyFeatures, markdown: chatbot.enableMarkdown,
                            agentName: view.handoff.agentName, locale: locale, theme: theme,
                            onFeedback: { _ in }, onRetry: {})
                    }
                }
                .padding(.horizontal, 14).padding(.vertical, 12)
            }
        }
    }

    /// Lecture seule : pas de pouces haut/bas sur une conversation terminée.
    private var readOnlyFeatures: VoxoFeatures {
        var features = chatbot.features
        features.messageFeedback = false
        return features
    }

    private func open(_ item: VoxoArchivedConversation) {
        opened = item
        transcript = .loading
        Task {
            do { transcript = .loaded(try await controller.archivedConversation(item.sessionId)) }
            catch { transcript = .failed((error as? VoxoException)?.message ?? VoxoI18n.text(locale, "genericError")) }
        }
    }

    private func centered<Content: View>(_ content: Content) -> some View {
        content.frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Ferme le clavier sans dépendre de la hiérarchie de vues (UIKit n'existe pas sur macOS).
enum UIKitKeyboard {
    static func dismiss() {
        #if canImport(UIKit)
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        #endif
    }
}
#endif
