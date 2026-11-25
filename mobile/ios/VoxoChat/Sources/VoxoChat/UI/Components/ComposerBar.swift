#if canImport(SwiftUI)
import SwiftUI

/// Zone de saisie : pièces en attente, bouton de jointure, champ, envoi.
struct VoxoComposerBar: View {
    let pending: [VoxoPendingAttachment]
    let maxFiles: Int
    let isSending: Bool
    let attachmentsEnabled: Bool
    let locale: String
    let theme: VoxoTheme
    let onSend: (String) -> Void
    let onPickFiles: () -> Void
    let onRemoveAttachment: (String) -> Void
    let onActivity: () -> Void
    let onTyping: (String) -> Void

    @State private var text = ""

    private var canSend: Bool {
        !isSending && (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || pending.contains { $0.isUploaded })
    }

    var body: some View {
        VStack(spacing: 0) {
            pendingAttachments
            HStack(spacing: 6) {
                if attachmentsEnabled { attachButton }
                TextField(VoxoI18n.text(locale, "composerHint"), text: $text)
                    .font(.system(size: 15))
                    .foregroundColor(theme.text.color)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(theme.surfaceMuted.color)
                    .clipShape(Capsule())
                    .onChange(of: text) { value in onActivity(); onTyping(value) }
                    .onSubmit(submit)
                Button(action: submit) {
                    Text("➤").font(.system(size: 20)).foregroundColor(canSend ? theme.accent.color : theme.textMuted.color)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .disabled(!canSend)
                .accessibilityLabel(VoxoI18n.text(locale, "sendMessageLabel"))
            }
            .padding(.horizontal, 10).padding(.vertical, 8)
        }
        .background(theme.surface.color)
    }

    private var attachButton: some View {
        let full = pending.count >= maxFiles
        return Button(action: onPickFiles) {
            Text("📎").font(.system(size: 20)).frame(minWidth: 40, minHeight: 44)
        }
        .disabled(full)
        .accessibilityLabel(full
            ? VoxoI18n.text(locale, "attachLimitReached", ["count": maxFiles])
            : VoxoI18n.text(locale, "attachFileTooltip"))
    }

    private func submit() {
        guard canSend else { return }
        onSend(text)
        text = ""
    }

    @ViewBuilder private var pendingAttachments: some View {
        if !pending.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(pending) { item in
                        HStack(spacing: 4) {
                            Text(item.isImage ? "🖼" : "📄").font(.system(size: 12))
                            Text(item.isUploaded ? item.name : VoxoI18n.text(locale, "uploadingLabel"))
                                .font(.system(size: 12)).foregroundColor(theme.text.color).lineLimit(1)
                            Button(action: { onRemoveAttachment(item.localId) }) {
                                Text("✕").font(.system(size: 12)).foregroundColor(theme.textMuted.color)
                            }
                            .accessibilityLabel(VoxoI18n.text(locale, "removeAttachment", ["name": item.name]))
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .overlay(Capsule().stroke(theme.border.color, lineWidth: 1))
                    }
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
            }
        }
    }
}
#endif
