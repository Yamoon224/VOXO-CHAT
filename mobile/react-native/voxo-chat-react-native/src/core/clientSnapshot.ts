import type { VoxoPendingAttachment } from '../models/attachment'
import type { VoxoChatbotConfig } from '../models/chatbotConfig'
import { DEFAULT_CHATBOT_CONFIG } from '../models/chatbotConfig'
import type { VoxoHandoff } from '../models/handoff'
import { NO_HANDOFF } from '../models/handoff'
import type { VoxoMessage } from '../models/message'
import type { VoxoAttachmentQueue } from './attachmentQueue'
import type { VoxoComposer } from './composer'
import type { VoxoConnectivity, VoxoConversationState } from './conversationState'

/**
 * Champs de vue partagés entre le client et ses collaborateurs.
 *
 * Un objet mutable unique plutôt qu'une nuée de rappels : le cycle de vie de la
 * session écrit dedans, la projection le lit, et le client n'a pas à relayer
 * chaque changement à la main.
 */
export interface VoxoViewState {
  chatbot: VoxoChatbotConfig
  connectivity: VoxoConnectivity
  handoff: VoxoHandoff
  lastError?: string
  userId: string
  ready: boolean
  /** Le chat est visible : condition de la surveillance d'inactivité. */
  active: boolean
}

export function createViewState(): VoxoViewState {
  return {
    chatbot: DEFAULT_CHATBOT_CONFIG,
    connectivity: 'connecting',
    handoff: NO_HANDOFF,
    userId: '',
    ready: false,
    active: false,
  }
}

/**
 * Instantané immuable de l'état, tel que l'UI le consomme.
 *
 * C'est le **modèle de lecture** : rien ici n'est modifiable, et l'objet est
 * remplacé à chaque changement. C'est ce changement de référence qui déclenche
 * le rendu côté React, via `useSyncExternalStore`.
 */
export interface VoxoClientSnapshot {
  messages: VoxoMessage[]
  chatbot: VoxoChatbotConfig
  connectivity: VoxoConnectivity
  handoff: VoxoHandoff
  attachments: readonly VoxoPendingAttachment[]
  /** Un message est en cours d'envoi : la zone de saisie reste bloquée. */
  isSending: boolean
  /** Une pièce jointe monte encore : le message doit l'attendre. */
  isUploading: boolean
  isReady: boolean
  sessionId: string
  sessionEnded: boolean
  /** Une note ne se propose qu'après une vraie réponse de l'assistant. */
  canRate: boolean
  /** Message à afficher puis à consommer via `clearError`. */
  lastError?: string
}

export interface SnapshotSources {
  view: VoxoViewState
  state: VoxoConversationState
  composer: VoxoComposer
  attachments: VoxoAttachmentQueue
}

export function buildSnapshot({
  view,
  state,
  composer,
  attachments,
}: SnapshotSources): VoxoClientSnapshot {
  return {
    // `ordered` produit déjà une copie triée : l'UI ne peut pas muter le fil.
    messages: state.ordered,
    chatbot: view.chatbot,
    connectivity: view.connectivity,
    handoff: view.handoff,
    attachments: [...attachments.all],
    isSending: composer.isSending,
    isUploading: attachments.isUploading,
    isReady: view.ready,
    sessionId: state.sessionId,
    sessionEnded: state.sessionEnded,
    canRate: view.chatbot.features.conversationRating && state.hasServerReply,
    lastError: view.lastError,
  }
}
