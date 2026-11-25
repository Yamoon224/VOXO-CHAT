#if canImport(SwiftUI)
import SwiftUI

/// Heure, statut d'envoi, pouces haut/bas — ou « Non envoyé » avec réessai.
struct VoxoMessageFooter: View {
    let message: VoxoMessage
    let features: VoxoFeatures
    let locale: String
    let theme: VoxoTheme
    let onFeedback: (VoxoFeedback) -> Void
    let onRetry: () -> Void

    var body: some View {
        if message.hasFailed {
            failure
        } else {
            HStack(spacing: 4) {
                if features.showTimestamps {
                    Text(VoxoDateLabels.time(message.timestamp)).font(.system(size: 11)).foregroundColor(theme.textMuted.color)
                }
                if features.showDeliveryStatus && message.isFromUser {
                    Text(message.deliveryStatus == .answered ? "✓✓" : "◷")
                        .font(.system(size: 11)).foregroundColor(theme.textMuted.color)
                }
                if features.messageFeedback && message.canReceiveFeedback {
                    feedbackButton("👍", VoxoI18n.text(locale, "feedbackUseful"), .up)
                    feedbackButton("👎", VoxoI18n.text(locale, "feedbackNotUseful"), .down)
                }
            }
            .padding(.top, 3).padding(.horizontal, 4).padding(.bottom, 4)
        }
    }

    private var failure: some View {
        HStack(spacing: 8) {
            Text("⚠ " + VoxoI18n.text(locale, "messageFailed")).font(.system(size: 11)).foregroundColor(theme.danger.color)
            Button(action: onRetry) {
                Text(VoxoI18n.text(locale, "retryLabel")).font(.system(size: 11, weight: .semibold))
                    .underline().foregroundColor(theme.accent.color)
            }
        }
        .padding(.top, 3).padding(.trailing, 4).padding(.bottom, 4)
    }

    private func feedbackButton(_ glyph: String, _ label: String, _ value: VoxoFeedback) -> some View {
        Button(action: { onFeedback(value) }) {
            Text(glyph).font(.system(size: 13)).padding(4)
                .background(message.feedback == value ? theme.accent.color.opacity(0.2) : Color.clear)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(message.feedback == value ? .isSelected : [])
    }
}

/// Pièces jointes d'un message : miniature si image avec URL, sinon une ligne de fichier.
struct VoxoAttachmentList: View {
    let attachments: [VoxoAttachment]
    let foreground: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(attachments) { attachment in
                if attachment.isImage, let urlString = attachment.url, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFit().cornerRadius(10)
                        case .failure: fileRow(attachment)
                        default: ProgressView()
                        }
                    }
                } else {
                    fileRow(attachment)
                }
            }
        }
        .padding(.bottom, 6)
    }

    private func fileRow(_ attachment: VoxoAttachment) -> some View {
        HStack(spacing: 6) {
            Text(attachment.isImage ? "🖼" : "📄").font(.system(size: 13))
            Text(attachment.name).font(.system(size: 13)).foregroundColor(foreground).lineLimit(1).truncationMode(.tail)
        }
    }
}
#endif
