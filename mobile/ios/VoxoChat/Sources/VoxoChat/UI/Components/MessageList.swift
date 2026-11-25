#if canImport(SwiftUI)
import SwiftUI

/// Fil de messages : séparateurs de jour, réponses rapides sous le dernier message,
/// indicateur de frappe, défilement vers le bas à chaque arrivée.
struct VoxoMessageList: View {
    let messages: [VoxoMessage]
    let features: VoxoFeatures
    let markdown: Bool
    let isTyping: Bool
    let agentName: String?
    let locale: String
    let theme: VoxoTheme
    let onSuggestion: (String) -> Void
    let onFeedback: (VoxoMessage, VoxoFeedback) -> Void
    let onRetry: (String) -> Void

    private static let bottomId = "voxo-bottom"

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                        if features.dateSeparators && startsNewDay(index) {
                            VoxoDateSeparator(label: VoxoDateLabels.daySeparator(message.timestamp, locale: locale), theme: theme)
                        }
                        VoxoMessageBubble(
                            message: message, features: features, markdown: markdown, agentName: agentName,
                            locale: locale, theme: theme,
                            onFeedback: { onFeedback(message, $0) }, onRetry: { onRetry(message.id) })
                        if index == messages.count - 1 && !message.isFromUser {
                            VoxoQuickReplies(suggestions: message.suggestions, theme: theme, onSelected: onSuggestion)
                        }
                    }
                    if isTyping {
                        VoxoTypingIndicator(theme: theme, locale: locale).padding(.bottom, 10)
                    }
                    Color.clear.frame(height: 1).id(Self.bottomId)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
            // Suit le bas du fil quand un message arrive ou que l'indicateur apparaît.
            .onChange(of: messages.count) { _ in scrollToBottom(proxy) }
            .onChange(of: isTyping) { _ in scrollToBottom(proxy) }
            .onAppear { scrollToBottom(proxy, animated: false) }
        }
    }

    private func startsNewDay(_ index: Int) -> Bool {
        guard index > 0 else { return true }
        return !Calendar.current.isDate(messages[index].timestamp, inSameDayAs: messages[index - 1].timestamp)
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy, animated: Bool = true) {
        DispatchQueue.main.async {
            if animated {
                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(Self.bottomId, anchor: .bottom) }
            } else {
                proxy.scrollTo(Self.bottomId, anchor: .bottom)
            }
        }
    }
}
#endif
