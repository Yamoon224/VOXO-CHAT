package chat.voxo.sdk.core

/**
 * Saisie : orchestre une action d'envoi ou de réessai (une à la fois), gère la
 * file de pièces jointes et déclenche la persistance.
 */
internal class VoxoComposer(
    private val sender: VoxoMessageSender,
    private val attachments: VoxoAttachmentQueue,
    private val state: VoxoConversationState,
    private val config: VoxoConfig,
    private val onChanged: () -> Unit,
    private val onError: (String) -> Unit,
    /** Un envoi vaut signe de vie : la clôture automatique repart de zéro. */
    private val onActivity: () -> Unit,
    private val onPersist: suspend () -> Unit,
    private val ensureOpenSession: suspend () -> Unit,
) {
    var isSending: Boolean = false
        private set

    suspend fun send(text: String) {
        val trimmed = text.trim()
        if (isSending) return

        // Rattacher une pièce dont l'upload n'est pas fini enverrait un id inconnu du serveur.
        if (attachments.isUploading) {
            onError(VoxoI18n.text(config.locale, "attachmentStillUploading"))
            return
        }
        if (trimmed.isEmpty() && attachments.uploadedIds.isEmpty()) return

        if (state.sessionEnded) ensureOpenSession()

        isSending = true
        onActivity()
        onChanged()

        // La file est vidée avant l'appel : les pièces appartiennent désormais au message.
        val pending = attachments.uploaded
        val ids = attachments.uploadedIds
        attachments.clear()

        try {
            sender.send(trimmed, ids, pending)
        } finally {
            finish()
        }
    }

    suspend fun retry(messageId: String) {
        val message = state.byId(messageId)
        if (message == null || !message.hasFailed || isSending) return

        isSending = true
        onChanged()
        try {
            sender.send(message.text, message.pendingAttachmentIds, retryOf = message)
        } finally {
            finish()
        }
    }

    private suspend fun finish() {
        isSending = false
        onPersist()
        onChanged()
    }
}
