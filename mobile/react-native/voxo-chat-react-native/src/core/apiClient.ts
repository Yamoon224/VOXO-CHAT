import type { VoxoPendingAttachment } from '../models/attachment'
import type { VoxoConfig } from './config'
import type { JsonObject } from './envelope'
import { unwrapEnvelope } from './envelope'
import { VoxoError } from './errors'
import { VoxoLimits } from './limits'
import type { VoxoPushPlatform } from './pushPlatform'

export interface SendMessageInput {
  message: string
  sessionId: string
  /**
   * UUID v4 : c'est lui qui porte l'idempotence côté serveur, un identifiant
   * d'une autre forme est rejeté en 400.
   */
  clientMessageId: string
  userId: string
  userName?: string
  userEmail?: string
  attachmentIds?: string[]
}

export interface EndConversationInput {
  rating?: number
  feedback?: string
  sessionDurationMs?: number
  messageCount?: number
}

export interface MessageFeedbackInput {
  /** `serverId` du message, jamais l'identifiant local. */
  messageId?: string
  messageIndex?: number
  /** `null` retire l'avis. */
  value: string | null
}

/** Injecté par les tests ; par défaut, le `fetch` global de React Native. */
export type FetchLike = typeof fetch

/**
 * Client REST des routes publiques `/widget/*`.
 *
 * C'est le **seul** point du SDK qui parle au réseau en HTTP. Le header
 * `X-Tenant-ID` est posé ici, sur chaque requête, et nulle part ailleurs. Voir
 * `mobile/CONTRACT.md` pour la forme des payloads.
 */
export class VoxoApiClient {
  constructor(
    private readonly config: VoxoConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  private get tenantHeader(): Record<string, string> {
    return {
      'X-Tenant-ID': this.config.tenantId,
      'Accept-Language': this.config.locale,
      // Seulement s'il est renseigné : jamais d'en-tête vide.
      ...(this.config.appId ? { 'X-App-Id': this.config.appId } : {}),
    }
  }

  private get jsonHeaders(): Record<string, string> {
    return { ...this.tenantHeader, 'Content-Type': 'application/json' }
  }

  /** `URLSearchParams` est incomplet en React Native : la query est assemblée à la main. */
  private url(path: string, query?: Record<string, string>): string {
    const search = query
      ? `?${Object.entries(query)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&')}`
      : ''
    return `${this.config.apiUrl}${path}${search}`
  }

  /** `POST /widget/message`. */
  sendMessage(input: SendMessageInput): Promise<JsonObject> {
    return this.request(this.url('/widget/message'), {
      method: 'POST',
      headers: this.jsonHeaders,
      body: JSON.stringify({
        message: input.message,
        sessionId: input.sessionId,
        clientMessageId: input.clientMessageId,
        userId: input.userId,
        ...(input.userName ? { userName: input.userName } : {}),
        ...(input.userEmail ? { userEmail: input.userEmail } : {}),
        ...(input.attachmentIds?.length ? { attachmentIds: input.attachmentIds } : {}),
        metadata: { platform: 'mobile', sdk: 'react-native', locale: this.config.locale },
      }),
    })
  }

  /**
   * `POST /widget/upload` — multipart, champ `file`. **Aucun `Content-Type`
   * posé à la main** : React Native écrit lui-même le `boundary`. Délai élargi :
   * l'extraction du contenu se fait pendant la requête.
   */
  uploadAttachment(file: VoxoPendingAttachment): Promise<JsonObject> {
    const body = new FormData()
    body.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/octet-stream',
      // React Native attend cette forme dans un FormData ; elle n'existe pas
      // dans les types DOM, d'où la conversion.
    } as unknown as Blob)

    return this.request(
      this.url('/widget/upload'),
      { method: 'POST', headers: this.tenantHeader, body },
      VoxoLimits.uploadTimeoutMs,
    )
  }

  /**
   * `GET /widget/conversation/:sessionId`.
   *
   * Lève une `VoxoError` avec `isNotFound` quand la conversation n'existe pas
   * encore : c'est le cas **normal** d'une session neuve, à traiter comme « pas
   * d'historique » et non comme une erreur affichable.
   */
  getConversation(sessionId: string, limit = 50, offset = 0): Promise<JsonObject> {
    return this.request(
      this.url(`/widget/conversation/${encodeURIComponent(sessionId)}`, {
        limit: String(limit),
        offset: String(offset),
      }),
      { headers: this.tenantHeader },
    )
  }

  endConversation(sessionId: string, input: EndConversationInput): Promise<JsonObject> {
    return this.postConversation(sessionId, 'end', {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.feedback ? { feedback: input.feedback } : {}),
      sessionDuration: input.sessionDurationMs ?? null,
      messageCount: input.messageCount ?? null,
    })
  }

  /**
   * `POST /widget/conversation/:sessionId/timeout`. Le motif de clôture est
   * imposé par la route ; le client ne peut pas le choisir.
   */
  endConversationForInactivity(
    sessionId: string,
    sessionDurationMs?: number,
    messageCount?: number,
  ): Promise<JsonObject> {
    return this.postConversation(sessionId, 'timeout', {
      sessionDuration: sessionDurationMs ?? null,
      messageCount: messageCount ?? null,
    })
  }

  /** `POST /widget/conversation/:sessionId/message-feedback`. */
  sendMessageFeedback(sessionId: string, input: MessageFeedbackInput): Promise<JsonObject> {
    return this.postConversation(sessionId, 'message-feedback', {
      ...(input.messageId ? { messageId: input.messageId } : {}),
      ...(input.messageIndex !== undefined ? { messageIndex: input.messageIndex } : {}),
      value: input.value,
    })
  }

  /** `POST /widget/push-token` — lie le jeton à la session courante. */
  registerPushToken(
    sessionId: string,
    token: string,
    platform: VoxoPushPlatform,
    locale: string,
  ): Promise<JsonObject> {
    const body = JSON.stringify({ sessionId, token, platform, locale })
    return this.request(this.url('/widget/push-token'), { method: 'POST', headers: this.jsonHeaders, body })
  }

  /** `DELETE /widget/push-token` — oublie le jeton côté serveur. */
  unregisterPushToken(token: string): Promise<JsonObject> {
    const body = JSON.stringify({ token })
    return this.request(this.url('/widget/push-token'), { method: 'DELETE', headers: this.jsonHeaders, body })
  }

  /** `GET /widget/config` — thème, nom, message d'accueil, fonctionnalités. */
  getConfig(): Promise<JsonObject> {
    return this.request(this.url('/widget/config'), { headers: this.tenantHeader })
  }

  getQuickReplies(category = 'greeting'): Promise<JsonObject> {
    return this.request(this.url('/widget/quick-replies', { category }), {
      headers: this.tenantHeader,
    })
  }

  /**
   * `GET /widget/health`. Ne lève jamais : renvoie `false` si le service ne
   * répond pas « healthy », l'état de connectivité n'étant pas une erreur.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const data = await this.request(
        this.url('/widget/health'),
        { headers: this.tenantHeader },
        10_000,
      )
      return data.status === 'healthy'
    } catch {
      return false
    }
  }

  private postConversation(
    sessionId: string,
    action: string,
    body: JsonObject,
  ): Promise<JsonObject> {
    return this.request(
      this.url(`/widget/conversation/${encodeURIComponent(sessionId)}/${action}`),
      { method: 'POST', headers: this.jsonHeaders, body: JSON.stringify(body) },
    )
  }

  /**
   * Exécute la requête, applique le délai maximal et traduit les défaillances de
   * transport en `VoxoError` affichables.
   */
  private async request(
    url: string,
    init: RequestInit,
    timeoutMs: number = VoxoLimits.requestTimeoutMs,
  ): Promise<JsonObject> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await this.fetchImpl(url, { ...init, signal: controller.signal })
      const body = await response.text()
      return unwrapEnvelope(response.status, body, this.config.locale)
    } catch (error) {
      if (error instanceof VoxoError) throw error
      // `AbortError` couvre le délai dépassé ; tout le reste est une panne de
      // transport que l'utilisateur doit comprendre comme telle.
      throw controller.signal.aborted
        ? VoxoError.timeout(this.config.locale)
        : VoxoError.network(this.config.locale)
    } finally {
      clearTimeout(timer)
    }
  }
}
