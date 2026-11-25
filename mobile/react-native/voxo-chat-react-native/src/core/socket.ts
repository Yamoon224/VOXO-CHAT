import type { JsonObject } from './envelope'
import { isJsonObject } from './envelope'
import type { VoxoConfig } from './config'
import { VoxoLimits } from './limits'
import type { VoxoHandoff } from '../models/handoff'
import { handoffFromApi } from '../models/handoff'

/**
 * Événement descendant du flux de conversation.
 *
 * Le socket est **descendant**, à une exception près : la trame montante
 * `typing` (aperçu de saisie, voir `sendTyping`). L'envoi d'un message passe
 * toujours par `POST /widget/message`.
 */
export interface VoxoSocketEvent {
  /** `conversation.sync` (recharger l'historique) ou `message`. */
  type?: string
  /** Présent sur n'importe quel événement dès que l'état de reprise change. */
  handoff?: VoxoHandoff
  /** Charge brute du message, au format de l'historique. */
  message?: JsonObject
}

export function socketEventFromJson(json: JsonObject): VoxoSocketEvent {
  const handoff = json.handoff
  const message = json.message
  return {
    type: typeof json.type === 'string' ? json.type : undefined,
    handoff: isJsonObject(handoff) ? handoffFromApi(handoff) : undefined,
    message: isJsonObject(message) ? message : undefined,
  }
}

export function isSyncEvent(event: VoxoSocketEvent): boolean {
  return event.type === 'conversation.sync'
}

/**
 * Seuls les messages d'agent arrivent par ce canal : les réponses de
 * l'assistant reviennent déjà dans la réponse de `POST /widget/message`.
 */
export function isAgentMessage(event: VoxoSocketEvent): boolean {
  return event.type === 'message' && event.message?.role === 'agent'
}

/** Interface minimale d'un WebSocket, pour pouvoir en injecter un faux. */
export interface VoxoSocketLike {
  close(): void
  send(data: string): void
  /** Comme `WebSocket.readyState` : 1 = ouvert. Absent = présumé ouvert. */
  readonly readyState?: number
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: unknown) => void) | null
  onopen: ((event: unknown) => void) | null
}

const WS_OPEN = 1

export type SocketConnector = (url: string) => VoxoSocketLike

/**
 * Connexion au flux temps réel d'une conversation, avec reconnexion automatique
 * en backoff exponentiel plafonné à 15 s.
 */
export class VoxoSocket {
  private socket: VoxoSocketLike | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private sessionId: string | null = null
  private attempt = 0
  private disposed = false
  private readonly listeners = new Set<(event: VoxoSocketEvent) => void>()

  constructor(
    private readonly config: VoxoConfig,
    private readonly connect: SocketConnector = (url) =>
      new WebSocket(url) as unknown as VoxoSocketLike,
  ) {}

  onEvent(listener: (event: VoxoSocketEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Ouvre le flux de `sessionId`. Un appel sur une session déjà connectée est
   * sans effet ; sur une autre session, la connexion précédente est fermée.
   */
  open(sessionId: string): void {
    if (this.disposed) return
    if (this.sessionId === sessionId && this.socket !== null) return
    this.sessionId = sessionId
    this.attempt = 0
    this.start()
  }

  private start(): void {
    this.clearTimer()
    this.closeSocket()

    const sessionId = this.sessionId
    if (sessionId === null || this.disposed) return

    try {
      const socket = this.connect(this.config.conversationSocketUrl(sessionId))
      this.socket = socket
      socket.onopen = () => {
        this.attempt = 0
      }
      socket.onmessage = (event) => this.emit(event.data, sessionId)
      // Le socket ne remonte aucune erreur applicative : un refus
      // d'autorisation détruit la connexion sans handshake. Toute terminaison,
      // propre ou non, mène donc à une nouvelle tentative.
      socket.onerror = () => this.scheduleReconnect(sessionId)
      socket.onclose = () => this.scheduleReconnect(sessionId)
    } catch {
      this.scheduleReconnect(sessionId)
    }
  }

  private emit(data: unknown, sessionId: string): void {
    if (sessionId !== this.sessionId || typeof data !== 'string') return
    this.attempt = 0
    try {
      const parsed: unknown = JSON.parse(data)
      if (!isJsonObject(parsed)) return
      const event = socketEventFromJson(parsed)
      for (const listener of [...this.listeners]) listener(event)
    } catch {
      // Charge illisible : on l'ignore plutôt que de rompre le flux.
    }
  }

  /**
   * `min(1000 × 2^tentative, 15000)` ms. La tentative est abandonnée si la
   * session a changé entre-temps : le socket est indexé sur le `sessionId`.
   */
  private scheduleReconnect(sessionId: string): void {
    this.closeSocket()
    if (this.disposed || sessionId !== this.sessionId) return

    const delay = Math.min(
      VoxoLimits.socketReconnectBaseMs * 2 ** this.attempt,
      VoxoLimits.socketReconnectMaxMs,
    )
    this.attempt += 1
    this.clearTimer()
    this.reconnectTimer = setTimeout(() => {
      if (sessionId === this.sessionId) this.start()
    }, delay)
  }

  private clearTimer(): void {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private closeSocket(): void {
    const socket = this.socket
    this.socket = null
    if (socket === null) return
    // On détache avant de fermer : sinon `onclose` relancerait une tentative.
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket.onopen = null
    socket.close()
  }

  /**
   * Seule trame montante du socket : l'aperçu de saisie (voir `CONTRACT.md`).
   * `false` si le socket n'est pas ouvert — le texte est alors perdu, il ne
   * sera pas rejoué.
   */
  sendTyping(text: string): boolean {
    const socket = this.socket
    if (socket === null) return false
    if (socket.readyState !== undefined && socket.readyState !== WS_OPEN) return false
    try {
      socket.send(JSON.stringify({ type: 'typing', text }))
      return true
    } catch {
      return false
    }
  }

  /** Ferme le flux sans empêcher une réouverture ultérieure via `open`. */
  close(): void {
    this.clearTimer()
    this.sessionId = null
    this.closeSocket()
  }

  dispose(): void {
    this.disposed = true
    this.close()
    this.listeners.clear()
  }
}
