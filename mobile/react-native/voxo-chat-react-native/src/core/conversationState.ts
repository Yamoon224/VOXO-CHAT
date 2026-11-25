import type { VoxoDeliveryStatus, VoxoFeedback, VoxoMessage } from '../models/message'
import { hasFailed, isFromUser } from '../models/message'
import { VoxoLimits } from './limits'
import { uuidV4 } from './uuid'

/** Disponibilité du service telle que le SDK la perçoit. */
export type VoxoConnectivity = 'connecting' | 'available' | 'unavailable'

/**
 * Conteneur d'état du fil de conversation.
 *
 * Purement synchrone : aucune notion de réseau, de persistance ni d'UI. Il
 * détient les messages et les compteurs, et sait les faire évoluer ; c'est le
 * client qui décide *quand*.
 */
export class VoxoConversationState {
  sessionId: string
  messages: VoxoMessage[] = []

  /**
   * Messages envoyés par l'utilisateur dans cette session, pour les métriques
   * de clôture.
   */
  messageCount = 0

  conversationStartedAt?: number
  sessionEnded = false

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? uuidV4()
  }

  /**
   * Vue triée du fil, la plus ancienne en premier. L'historique serveur et les
   * événements du socket peuvent arriver dans le désordre.
   */
  get ordered(): VoxoMessage[] {
    // Dédoublonnée par identifiant : un `id` répété ferait planter les listes de l'UI (clé).
    const seen = new Set<string>()
    const unique = this.messages.filter((message) => {
      if (seen.has(message.id)) return false
      seen.add(message.id)
      return true
    })
    return unique.sort((a, b) => a.timestamp - b.timestamp)
  }

  get isEmpty(): boolean {
    return this.messages.length === 0
  }

  /** Une note de fin n'a de sens qu'une fois l'assistant ayant répondu. */
  get hasServerReply(): boolean {
    return this.messages.some((message) => !isFromUser(message) && message.serverId !== undefined)
  }

  byId(id: string): VoxoMessage | undefined {
    return this.messages.find((message) => message.id === id)
  }

  hasServerId(serverId: string | undefined): boolean {
    if (serverId === undefined) return false
    return this.messages.some((message) => message.serverId === serverId)
  }

  /**
   * Ajoute un message et applique le plafond mémoire en évinçant les plus
   * anciens.
   */
  add(message: VoxoMessage): VoxoMessage {
    this.messages.push(message)
    if (isFromUser(message) && !message.isWelcome) this.messageCount += 1
    this.conversationStartedAt ??= Date.now()

    if (this.messages.length > VoxoLimits.maxMessagesInMemory) {
      this.messages = this.messages.slice(-VoxoLimits.maxMessagesInMemory)
    }
    return message
  }

  /** Met à jour un message en place. Renvoie `undefined` s'il a été évincé. */
  update(
    id: string,
    changes: {
      serverId?: string
      deliveryStatus?: VoxoDeliveryStatus
      feedback?: VoxoFeedback
      clearFeedback?: boolean
      messageIndex?: number
    },
  ): VoxoMessage | undefined {
    const index = this.messages.findIndex((message) => message.id === id)
    if (index === -1) return undefined

    const current = this.messages[index]!
    const updated: VoxoMessage = {
      ...current,
      serverId: changes.serverId ?? current.serverId,
      deliveryStatus: changes.deliveryStatus ?? current.deliveryStatus,
      feedback: changes.clearFeedback ? undefined : (changes.feedback ?? current.feedback),
      messageIndex: changes.messageIndex ?? current.messageIndex,
    }
    this.messages[index] = updated
    return updated
  }

  /**
   * Remplace tout le fil par l'historique serveur, en conservant les messages
   * locaux encore en vol : un message en cours d'envoi ou en échec n'existe pas
   * côté serveur et disparaîtrait sinon sous les yeux de l'utilisateur.
   */
  replaceWithHistory(history: VoxoMessage[]): void {
    const inFlight = this.messages.filter(
      (message) =>
        message.serverId === undefined &&
        !message.isWelcome &&
        message.deliveryStatus !== 'answered',
    )
    const welcome = this.messages.filter((message) => message.isWelcome)

    // Le message d'accueil est produit localement : le serveur ne le renvoie
    // pas, et il doit rester en tête du fil tant que celui-ci est vide.
    this.messages = [...(history.length === 0 ? welcome : []), ...history, ...inFlight]
  }

  /** Dernier message utilisateur en échec, cible naturelle d'un nouvel essai. */
  get lastFailed(): VoxoMessage | undefined {
    return [...this.messages].reverse().find((message) => isFromUser(message) && hasFailed(message))
  }

  /** Ouvre une session neuve en conservant l'identifiant du tenant. */
  reset(sessionId?: string): void {
    this.sessionId = sessionId ?? uuidV4()
    this.messages = []
    this.messageCount = 0
    this.conversationStartedAt = undefined
    this.sessionEnded = false
  }

  /** Durée de la conversation en millisecondes, pour les payloads de clôture. */
  get durationMs(): number | undefined {
    return this.conversationStartedAt === undefined
      ? undefined
      : Date.now() - this.conversationStartedAt
  }
}
