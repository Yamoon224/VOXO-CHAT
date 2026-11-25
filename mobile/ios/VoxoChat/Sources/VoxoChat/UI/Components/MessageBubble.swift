#if canImport(SwiftUI)
import SwiftUI

/// Bulle d'un message. L'utilisateur à droite (couleur d'accent), l'assistant et le
/// conseiller à gauche ; le conseiller est teinté et nommé.
struct VoxoMessageBubble: View {
    let message: VoxoMessage
    let features: VoxoFeatures
    let markdown: Bool
    let agentName: String?
    let locale: String
    let theme: VoxoTheme
    let onFeedback: (VoxoFeedback) -> Void
    let onRetry: () -> Void

    private var fromUser: Bool { message.isFromUser }
    private var background: Color {
        fromUser ? theme.userBubble.color : (message.role == .agent ? theme.agentBubble.color : theme.botBubble.color)
    }
    private var foreground: Color { fromUser ? theme.onUserBubble.color : theme.onBotBubble.color }

    var body: some View {
        VStack(alignment: fromUser ? .trailing : .leading, spacing: 0) {
            if message.role == .agent, let agentName {
                Text(agentName).font(.system(size: 11)).foregroundColor(theme.textMuted.color)
                    .padding(.leading, 4).padding(.bottom, 2)
            }
            VStack(alignment: .leading, spacing: 2) {
                if !message.attachments.isEmpty {
                    VoxoAttachmentList(attachments: message.attachments, foreground: foreground)
                }
                if !message.text.isEmpty { content }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(background)
            .clipShape(VoxoBubbleShape(radius: theme.cornerRadius, fromUser: fromUser))
            .frame(maxWidth: 300, alignment: fromUser ? .trailing : .leading)

            if !message.isWelcome {
                VoxoMessageFooter(
                    message: message, features: features, locale: locale, theme: theme,
                    onFeedback: onFeedback, onRetry: onRetry)
            }
        }
        .frame(maxWidth: .infinity, alignment: fromUser ? .trailing : .leading)
        .padding(.bottom, 6)
    }

    @ViewBuilder private var content: some View {
        if markdown && !fromUser {
            VoxoMarkdownView(text: message.text, color: foreground, linkColor: theme.accent.color, codeBackground: foreground.opacity(0.12))
        } else {
            Text(message.text).font(.system(size: 15)).foregroundColor(foreground)
        }
    }
}
#endif
