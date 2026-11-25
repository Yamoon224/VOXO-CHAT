import type { VoxoAttachmentQueue } from './attachmentQueue'
import type { VoxoConversationState } from './conversationState'
import { hasFailed, isFromUser } from '../models/message'
import type { VoxoMessageSender } from './messageSender'

export interface ComposerOptions {
  sender: VoxoMessageSender
  attachments: VoxoAttachmentQueue
  state: VoxoConversationState
  onChanged: () => void
  onError: (message: string) => void
  /** Repousse la clôture automatique et remet les relances à zéro. */
  onActivity: () => void
  onPersist: () => Promise<void>
  /** Ouvre une session neuve quand la précédente a été clôturée. */
  ensureOpenSession: () => Promise<void>
}

/**
 * Mécanique de la zone de saisie : garde-fous avant envoi, drapeau d'attente,
 * rattachement des pièces jointes, nouvel essai.
 *
 * Séparé du client, qui porte l'état de la conversation : ici on ne s'occupe que
 * du geste « envoyer ».
 */
export class VoxoComposer {
  private sending = false

  constructor(private readonly options: ComposerOptions) {}

  /** Un envoi est en cours : la zone de saisie doit rester bloquée. */
  get isSending(): boolean {
    return this.sending
  }

  async send(text: string): Promise<void> {
    const trimmed = text.trim()
    const { attachments, state, onError, onActivity, onChanged } = this.options

    if (this.sending) return

    // Rattacher une pièce dont l'upload n'est pas fini enverrait un
    // attachmentId encore inconnu du serveur.
    if (attachments.isUploading) {
      onError('Un fichier est encore en cours d’envoi.')
      return
    }
    if (trimmed.length === 0 && attachments.uploadedIds.length === 0) return

    if (state.sessionEnded) await this.options.ensureOpenSession()

    this.sending = true
    onActivity()
    onChanged()

    // La file est vidée avant l'appel : les pièces appartiennent désormais au
    // message, un second envoi ne doit pas les reprendre.
    const pending = attachments.uploaded
    const ids = attachments.uploadedIds
    attachments.clear()

    await this.options.sender.send({ text: trimmed, attachmentIds: ids, attachments: pending })
    await this.finish()
  }

  /**
   * Rejoue un message en échec. Son identifiant est conservé : le serveur le
   * reconnaît et ne traitera pas l'envoi deux fois. Les pièces jointes sont déjà
   * sur le serveur, seuls leurs identifiants sont renvoyés.
   */
  async retry(messageId: string): Promise<void> {
    const message = this.options.state.byId(messageId)
    if (!message || !isFromUser(message) || !hasFailed(message) || this.sending) return

    this.sending = true
    this.options.onChanged()

    await this.options.sender.send({
      text: message.text,
      attachmentIds: message.pendingAttachmentIds,
      retryOf: message,
    })
    await this.finish()
  }

  private async finish(): Promise<void> {
    this.sending = false
    await this.options.onPersist()
    this.options.onChanged()
  }
}
