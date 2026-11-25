import type { JsonObject } from '../core/envelope'
import { isJsonObject, numberAt, stringAt, stringArrayAt } from '../core/envelope'
import { uuidV4 } from '../core/uuid'
import type { VoxoAttachment } from './attachment'
import { attachmentFromApi, attachmentToJson } from './attachment'

/**
 * Auteur d'un message. `internal_note` n'est jamais exposé au widget par le
 * backend : il n'a pas d'équivalent ici.
 */
export type VoxoRole = 'user' | 'assistant' | 'agent'

export function roleFromApi(value: unknown): VoxoRole {
  if (value === 'user') return 'user'
  if (value === 'agent') return 'agent'
  return 'assistant'
}

/** Progression de l'envoi d'un message utilisateur. */
export type VoxoDeliveryStatus = 'sending' | 'answered' | 'failed'

/** Avis exprimé sur une réponse. */
export type VoxoFeedback = 'up' | 'down'

export function feedbackFromApi(value: unknown): VoxoFeedback | undefined {
  return value === 'up' || value === 'down' ? value : undefined
}

/**
 * Un message du fil de conversation.
 *
 * `id` est l'identifiant **local**, un UUID v4 qui sert aussi de
 * `clientMessageId` — c'est lui qui porte l'idempotence côté serveur.
 * `serverId` est l'identifiant attribué par le backend ; il n'existe qu'une fois
 * le message accepté, et c'est le seul utilisable pour le feedback.
 */
export interface VoxoMessage {
  id: string
  serverId?: string
  role: VoxoRole
  text: string
  /** Millisecondes depuis l'époque : comparable et sérialisable sans surprise. */
  timestamp: number
  /** Réponses rapides proposées sous le message. */
  suggestions: string[]
  attachments: VoxoAttachment[]
  deliveryStatus?: VoxoDeliveryStatus
  feedback?: VoxoFeedback
  /**
   * Rang du message dans la conversation, renvoyé par l'historique. Sert de
   * repli pour cibler un feedback quand `serverId` manque.
   */
  messageIndex?: number
  /**
   * Message d'accueil produit localement : jamais annoncé aux lecteurs d'écran,
   * jamais envoyé au serveur.
   */
  isWelcome: boolean
  /**
   * Identifiants serveur des pièces déjà envoyées, conservés pour pouvoir
   * réessayer le message sans re-téléverser les fichiers.
   */
  pendingAttachmentIds: string[]
}

export function createMessage(
  input: Partial<VoxoMessage> & Pick<VoxoMessage, 'role' | 'text'>,
): VoxoMessage {
  return {
    id: input.id ?? uuidV4(),
    serverId: input.serverId,
    role: input.role,
    text: input.text,
    timestamp: input.timestamp ?? Date.now(),
    suggestions: input.suggestions ?? [],
    attachments: input.attachments ?? [],
    deliveryStatus: input.deliveryStatus,
    feedback: input.feedback,
    messageIndex: input.messageIndex,
    isWelcome: input.isWelcome ?? false,
    pendingAttachmentIds: input.pendingAttachmentIds ?? [],
  }
}

export function isFromUser(message: VoxoMessage): boolean {
  return message.role === 'user'
}

export function hasFailed(message: VoxoMessage): boolean {
  return message.deliveryStatus === 'failed'
}

/** Un feedback ne peut cibler qu'un message que le serveur connaît. */
export function canReceiveFeedback(message: VoxoMessage): boolean {
  return (
    message.role !== 'user' && (message.serverId !== undefined || message.messageIndex !== undefined)
  )
}

/** Message tel que le renvoie `GET /widget/conversation/:sessionId`. */
export function messageFromHistory(json: JsonObject): VoxoMessage {
  const serverId = stringAt(json, 'id')
  const rawAttachments = json.attachments
  const timestamp = Date.parse(stringAt(json, 'timestamp') ?? '')

  return createMessage({
    id: serverId ?? uuidV4(),
    serverId,
    role: roleFromApi(json.role),
    text: stringAt(json, 'content') ?? '',
    timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
    attachments: Array.isArray(rawAttachments)
      ? rawAttachments.filter(isJsonObject).map(attachmentFromApi)
      : [],
    feedback: feedbackFromApi(json.feedback),
    messageIndex: numberAt(json, 'messageIndex'),
    deliveryStatus: json.role === 'user' ? 'answered' : undefined,
  })
}

export function messageToJson(message: VoxoMessage): JsonObject {
  return {
    id: message.id,
    serverId: message.serverId ?? null,
    role: message.role,
    text: message.text,
    timestamp: message.timestamp,
    suggestions: message.suggestions,
    attachments: message.attachments.map(attachmentToJson),
    deliveryStatus: message.deliveryStatus ?? null,
    feedback: message.feedback ?? null,
    messageIndex: message.messageIndex ?? null,
    isWelcome: message.isWelcome,
    pendingAttachmentIds: message.pendingAttachmentIds,
  }
}

export function messageFromJson(json: JsonObject): VoxoMessage {
  const rawAttachments = json.attachments
  const status = json.deliveryStatus

  return createMessage({
    id: stringAt(json, 'id'),
    serverId: stringAt(json, 'serverId'),
    role: roleFromApi(json.role),
    text: stringAt(json, 'text') ?? '',
    timestamp: numberAt(json, 'timestamp'),
    suggestions: stringArrayAt(json, 'suggestions'),
    attachments: Array.isArray(rawAttachments)
      ? rawAttachments.filter(isJsonObject).map(attachmentFromApi)
      : [],
    deliveryStatus:
      status === 'sending' || status === 'answered' || status === 'failed' ? status : undefined,
    feedback: feedbackFromApi(json.feedback),
    messageIndex: numberAt(json, 'messageIndex'),
    isWelcome: json.isWelcome === true,
    pendingAttachmentIds: stringArrayAt(json, 'pendingAttachmentIds'),
  })
}
