import type { VoxoPendingAttachment } from '../models/attachment'
import type { VoxoMessage } from '../models/message'
import { createMessage } from '../models/message'
import type { VoxoApiClient } from './apiClient'
import type { VoxoConfig } from './config'
import type { VoxoConversationState } from './conversationState'
import { stringArrayAt, stringAt } from './envelope'
import { VoxoError } from './errors'
import { VoxoLimits } from './limits'
import type { VoxoRateLimiter } from './rateLimiter'
import { voxoText } from '../i18n'

export interface MessageSenderOptions {
  api: VoxoApiClient
  config: VoxoConfig
  state: VoxoConversationState
  rateLimiter: VoxoRateLimiter
  onChanged: () => void
  onError: (message: string) => void
  /**
   * Le serveur a ouvert une nouvelle conversation : l'ancienne session doit être
   * archivée et le WebSocket reconnecté sur la nouvelle.
   */
  onSessionReplaced: (previousSessionId: string) => Promise<void>
  userId: () => string
}

export interface SendOptions {
  text: string
  attachmentIds?: string[]
  attachments?: VoxoPendingAttachment[]
  /**
   * Rejoue un message en échec **sans changer son identifiant** : c'est lui qui
   * porte l'idempotence, le serveur ne doit pas traiter deux fois le même envoi.
   */
  retryOf?: VoxoMessage
}

/**
 * Envoi d'un message et réconciliation de la réponse.
 *
 * Extrait du client pour que chacun garde une responsabilité lisible : ici, tout
 * ce qui se passe entre « l'utilisateur appuie sur envoyer » et « le fil reflète
 * la réponse du serveur ».
 */
export class VoxoMessageSender {
  constructor(private readonly options: MessageSenderOptions) {}

  /** Renvoie `true` si le serveur a accepté le message. */
  async send({ text, attachmentIds = [], attachments = [], retryOf }: SendOptions): Promise<boolean> {
    const { state, config, rateLimiter, api, onChanged, onError } = this.options

    if (text.length === 0 && attachmentIds.length === 0) return false

    if (text.length > VoxoLimits.maxMessageLength) {
      onError(voxoText(config.locale, 'messageTooLong', { max: VoxoLimits.maxMessageLength }))
      return false
    }

    if (!rateLimiter.tryConsume()) {
      onError(voxoText(config.locale, 'tooManyMessages'))
      return false
    }

    const message = retryOf ?? this.appendUserMessage(text, attachments, attachmentIds)
    state.update(message.id, { deliveryStatus: 'sending' })
    onChanged()

    try {
      const data = await api.sendMessage({
        message: text,
        sessionId: state.sessionId,
        clientMessageId: message.id,
        userId: this.options.userId(),
        userName: config.user?.name,
        userEmail: config.user?.email,
        attachmentIds,
      })

      // Le serveur peut avoir basculé la conversation sur une nouvelle session.
      const nextSessionId = stringAt(data, 'sessionId')
      if (nextSessionId && nextSessionId !== state.sessionId) {
        const previous = state.sessionId
        state.sessionId = nextSessionId
        await this.options.onSessionReplaced(previous)
      }

      state.update(message.id, {
        serverId: stringAt(data, 'userMessageId') ?? message.id,
        deliveryStatus: 'answered',
      })

      const assistantId = stringAt(data, 'assistantMessageId')
      const reply = stringAt(data, 'response')

      // Le socket a pu livrer la même réponse en parallèle : on ne l'ajoute
      // qu'une fois.
      if (reply && reply.length > 0 && !state.hasServerId(assistantId)) {
        state.add(
          createMessage({
            id: assistantId,
            serverId: assistantId,
            role: 'assistant',
            text: reply,
            suggestions: stringArrayAt(data, 'suggestions'),
          }),
        )
      }

      onChanged()
      return true
    } catch (error) {
      state.update(message.id, { deliveryStatus: 'failed' })
      onChanged()
      onError(error instanceof VoxoError ? error.message : voxoText(config.locale, 'sendFailed'))
      return false
    }
  }

  private appendUserMessage(
    text: string,
    attachments: VoxoPendingAttachment[],
    attachmentIds: string[],
  ): VoxoMessage {
    return this.options.state.add(
      createMessage({
        role: 'user',
        text,
        deliveryStatus: 'sending',
        pendingAttachmentIds: attachmentIds,
        attachments: attachments.map((item) => ({
          id: item.remoteId ?? item.localId,
          name: item.name,
          category: item.category,
          size: item.size,
        })),
      }),
    )
  }
}
