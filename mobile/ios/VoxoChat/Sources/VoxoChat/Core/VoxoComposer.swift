import Foundation

/// Saisie : orchestre une action d'envoi ou de réessai (une à la fois), gère la file de
/// pièces jointes et déclenche la persistance.
@MainActor
final class VoxoComposer {
    private let sender: VoxoMessageSender
    private let attachments: VoxoAttachmentQueue
    private let state: VoxoConversationState
    private let config: VoxoConfig
    private let onChanged: () -> Void
    private let onError: (String) -> Void
    /// Un envoi vaut signe de vie : la clôture automatique repart de zéro.
    private let onActivity: () -> Void
    private let onPersist: () async -> Void
    private let ensureOpenSession: () async -> Void

    private(set) var isSending = false

    init(
        sender: VoxoMessageSender,
        attachments: VoxoAttachmentQueue,
        state: VoxoConversationState,
        config: VoxoConfig,
        onChanged: @escaping () -> Void,
        onError: @escaping (String) -> Void,
        onActivity: @escaping () -> Void,
        onPersist: @escaping () async -> Void,
        ensureOpenSession: @escaping () async -> Void
    ) {
        self.sender = sender
        self.attachments = attachments
        self.state = state
        self.config = config
        self.onChanged = onChanged
        self.onError = onError
        self.onActivity = onActivity
        self.onPersist = onPersist
        self.ensureOpenSession = ensureOpenSession
    }

    func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if isSending { return }

        // Rattacher une pièce dont l'upload n'est pas fini enverrait un id inconnu du serveur.
        if attachments.isUploading {
            onError(VoxoI18n.text(config.locale, "attachmentStillUploading"))
            return
        }
        if trimmed.isEmpty && attachments.uploadedIds.isEmpty { return }

        if state.sessionEnded { await ensureOpenSession() }

        isSending = true
        onActivity()
        onChanged()

        // La file est vidée avant l'appel : les pièces appartiennent désormais au message.
        let pending = attachments.uploaded
        let ids = attachments.uploadedIds
        attachments.clear()

        await sender.send(text: trimmed, attachmentIds: ids, attachments: pending)
        await finish()
    }

    func retry(_ messageId: String) async {
        guard let message = state.byId(messageId), message.hasFailed, !isSending else { return }

        isSending = true
        onChanged()
        await sender.send(text: message.text, attachmentIds: message.pendingAttachmentIds, retryOf: message)
        await finish()
    }

    private func finish() async {
        isSending = false
        await onPersist()
        onChanged()
    }
}
