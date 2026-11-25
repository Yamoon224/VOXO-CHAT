import type { FetchLike } from '../../src/core/apiClient'
import type { VoxoSocketLike } from '../../src/core/socket'

export interface RecordedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

/**
 * Backend simulé reproduisant les enveloppes réelles de `/widget/*`.
 *
 * Les formes de réponse sont celles décrites dans `mobile/CONTRACT.md` : si le
 * backend change, ce fichier doit changer avec lui, et les tests qui s'appuient
 * dessus révèlent alors ce qui casse côté SDK.
 */
export class FakeBackend {
  /** Requêtes reçues, dans l'ordre : sert à vérifier en-têtes et payloads. */
  readonly requests: RecordedRequest[] = []

  /** Quand false, `GET /widget/conversation/:id` répond 404. */
  conversationExists = false

  /** Messages du fil côté serveur, renvoyés par l'historique. */
  conversationMessages: unknown[] = []

  assistantReply = 'Bonjour, en quoi puis-je aider ?'
  suggestions: string[] = []

  /** Bascule le prochain message sur une nouvelle session. */
  nextSessionId: string | null = null

  /** Force un échec sur le prochain `POST /widget/message`. */
  failMessageWithStatus: number | null = null
  failMessageError = 'Une erreur est survenue'
  failMessageCode = 'WIDGET_ERROR'

  /** Identifiant renvoyé par le prochain upload. */
  uploadId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

  /** Seulement les `POST /widget/message`. */
  get sentMessages(): RecordedRequest[] {
    return this.requests.filter((request) => request.url.endsWith('/widget/message'))
  }

  readonly fetch: FetchLike = async (input, init) => {
    const url = String(input)
    const headers = (init?.headers ?? {}) as Record<string, string>
    this.requests.push({
      url,
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : '',
    })

    if (url.includes('/widget/config')) return ok(CONFIG)
    if (url.includes('/widget/quick-replies')) {
      return ok({ suggestions: this.suggestions, category: 'greeting' })
    }
    if (url.endsWith('/widget/push-token')) {
      return ok(init?.method === 'DELETE' ? { removed: true } : { registered: true })
    }
    if (url.includes('/widget/health')) return ok({ status: 'healthy' })
    if (url.endsWith('/widget/upload')) {
      return ok({ id: this.uploadId, name: 'fichier', category: 'image' }, 201)
    }
    if (url.endsWith('/widget/message')) return this.message()
    if (url.endsWith('/end') || url.endsWith('/timeout')) return ok({ sessionId: 'closed' })
    if (url.endsWith('/message-feedback')) return ok({ ok: true })
    if (url.includes('/widget/conversation/')) return this.conversation()

    return fail(404, 'Route inconnue')
  }

  private message(): Response {
    if (this.failMessageWithStatus !== null) {
      const status = this.failMessageWithStatus
      this.failMessageWithStatus = null
      return fail(status, this.failMessageError, this.failMessageCode)
    }

    const sent = this.sentMessages[this.sentMessages.length - 1]
    const requested = JSON.parse(sent?.body ?? '{}') as { sessionId?: string }
    const sessionId = this.nextSessionId ?? requested.sessionId ?? 'session'
    this.nextSessionId = null

    return ok({
      sessionId,
      response: this.assistantReply,
      userMessageId: `srv-user-${this.requests.length}`,
      assistantMessageId: `srv-bot-${this.requests.length}`,
      sources: [],
      suggestions: this.suggestions,
      conversationId: 'conv-1',
    })
  }

  private conversation(): Response {
    if (!this.conversationExists) return fail(404, 'Conversation not found')
    return ok({
      sessionId: 'session',
      messages: this.conversationMessages,
      totalMessages: this.conversationMessages.length,
      handoffStatus: 'none',
      assignedAgent: null,
    })
  }
}

function ok(data: unknown, status = 200): Response {
  return jsonResponse({ success: true, data, message: 'ok' }, status)
}

function fail(status: number, error: string, code?: string): Response {
  return jsonResponse({ success: false, error, ...(code ? { code } : {}) }, status)
}

function jsonResponse(payload: unknown, status: number): Response {
  const body = JSON.stringify(payload)
  return {
    status,
    ok: status < 400,
    text: async () => body,
  } as Response
}

/**
 * Canal WebSocket simulé : permet de pousser des événements serveur dans le SDK
 * sans ouvrir de vraie connexion.
 */
export class FakeSocket implements VoxoSocketLike {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: ((event: unknown) => void) | null = null
  onopen: ((event: unknown) => void) | null = null

  closed = false

  /** Trames montantes envoyées par le SDK. */
  readonly sent: string[] = []
  readyState = 1

  send(data: string): void {
    this.sent.push(data)
  }

  /** Pousse un événement, tel que `conversationSocketService` l'émettrait. */
  emit(event: unknown): void {
    this.emitRaw(JSON.stringify(event))
  }

  /** Pousse une charge brute, pour éprouver les entrées malformées. */
  emitRaw(payload: unknown): void {
    this.onmessage?.({ data: payload })
  }

  close(): void {
    this.closed = true
  }
}

const CONFIG = {
  tenant: { id: 't-1', name: 'Acme', subscriptionPlan: 'pro' },
  chatbot: {
    name: 'Assistant Acme',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    theme: { primaryColor: '#7c3aed', textColor: '#111827' },
    features: { customBranding: false },
    options: {
      enableMarkdown: true,
      ui: {},
      features: {
        messageFeedback: true,
        conversationRating: true,
        showTimestamps: true,
        showDeliveryStatus: true,
        dateSeparators: true,
        connectivityStatus: true,
        attachments: true,
      },
      attachments: { maxFiles: 3, maxBytes: 10485760 },
    },
  },
}
