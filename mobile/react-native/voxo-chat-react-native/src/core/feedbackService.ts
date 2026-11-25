import type { VoxoFeedback, VoxoMessage } from '../models/message'
import { canReceiveFeedback } from '../models/message'
import type { VoxoApiClient } from './apiClient'
import type { VoxoConfig } from './config'
import type { VoxoConversationState } from './conversationState'
import { VoxoError } from './errors'
import { voxoText } from '../i18n'

export interface FeedbackServiceOptions {
  api: VoxoApiClient
  config: VoxoConfig
  state: VoxoConversationState
  onChanged: () => void
  onError: (message: string) => void
}

/**
 * Avis de l'utilisateur sur la conversation : pouce haut/bas par réponse et
 * notation de fin.
 *
 * Regroupé à part du client car c'est un sujet distinct — ce que l'utilisateur
 * *pense* de l'échange, et non la conduite de l'échange.
 */
export class VoxoFeedbackService {
  constructor(private readonly options: FeedbackServiceOptions) {}

  /**
   * Pouce haut/bas. Rejouer la même valeur retire l'avis.
   *
   * L'affichage est optimiste : la valeur est posée tout de suite et revient en
   * arrière si le serveur refuse. Un avis ne peut cibler qu'un message que le
   * serveur connaît.
   */
  async submitMessageFeedback(message: VoxoMessage, value: VoxoFeedback): Promise<void> {
    if (!canReceiveFeedback(message)) return

    const { state, api, config, onChanged, onError } = this.options
    const previous = message.feedback
    const next = previous === value ? undefined : value

    state.update(message.id, { feedback: next, clearFeedback: next === undefined })
    onChanged()

    try {
      await api.sendMessageFeedback(state.sessionId, {
        messageId: message.serverId,
        // Le rang ne sert que si le serveur n'a pas encore attribué d'id.
        messageIndex: message.serverId === undefined ? message.messageIndex : undefined,
        value: next ?? null,
      })
    } catch {
      state.update(message.id, { feedback: previous, clearFeedback: previous === undefined })
      onChanged()
      onError(voxoText(config.locale, 'feedbackSubmitFailed'))
    }
  }

  /**
   * Clôt la conversation avec une note de 1 à 5 et un commentaire facultatif.
   * Renvoie `false` si le serveur a refusé : la session reste ouverte.
   */
  async endConversation(rating?: number, feedback?: string): Promise<boolean> {
    const { state, api, config, onChanged, onError } = this.options

    try {
      await api.endConversation(state.sessionId, {
        rating,
        feedback,
        sessionDurationMs: state.durationMs,
        messageCount: state.messageCount,
      })
      state.sessionEnded = true
      onChanged()
      return true
    } catch (error) {
      onError(
        error instanceof VoxoError ? error.message : voxoText(config.locale, 'endConversationFailed'),
      )
      return false
    }
  }
}
