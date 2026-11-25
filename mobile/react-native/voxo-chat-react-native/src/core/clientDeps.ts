import { createMemoryStorage } from '../adapters/types'
import type { VoxoAdapters } from '../adapters/types'
import { defaultFilePicker } from '../adapters/filePicker'
import { defaultImageCompressor } from '../adapters/imageCompressor'
import { defaultLinking } from '../adapters/linking'
import { defaultStorage } from '../adapters/asyncStorage'
import type { VoxoHandoff } from '../models/handoff'
import type { FetchLike } from './apiClient'
import { VoxoApiClient } from './apiClient'
import { VoxoAttachmentQueue } from './attachmentQueue'
import { VoxoComposer } from './composer'
import type { VoxoConfig } from './config'
import type { VoxoConnectivity, VoxoConversationState } from './conversationState'
import { VoxoConversationSync } from './conversationSync'
import { VoxoFeedbackService } from './feedbackService'
import { VoxoMessageSender } from './messageSender'
import { VoxoPushRegistrar } from './pushRegistrar'
import type { VoxoRateLimiter } from './rateLimiter'
import { VoxoRealtimeBinder } from './realtimeBinder'
import { VoxoSessionStore } from './sessionStore'
import type { SocketConnector } from './socket'
import { VoxoSocket } from './socket'
import { VoxoTypingSender } from './typingSender'

export interface ClientDepsOptions {
  config: VoxoConfig
  state: VoxoConversationState
  rateLimiter: VoxoRateLimiter
  onChanged: () => void
  onError: (message: string) => void
  onHandoff: (handoff: VoxoHandoff) => void
  onConnectivity: (connectivity: VoxoConnectivity) => void
  onSystemMessage: (text: string) => void
  onSessionReplaced: (previousSessionId: string) => Promise<void>
  onPersist: () => Promise<void>
  ensureOpenSession: () => Promise<void>
  userId: () => string
  isActive: () => boolean
  /** Option locale ET fonctionnalité du propriétaire ET reprise humaine en cours. */
  isTypingEligible: () => boolean
  /** Injectés par les tests. */
  fetchImpl?: FetchLike
  socketConnector?: SocketConnector
}

/**
 * Racine de composition du client.
 *
 * Les collaborateurs forment un graphe fixe, et les assembler est une
 * responsabilité en soi : la rassembler ici garde le client concentré sur ce
 * qu'il expose plutôt que sur la façon dont il est monté.
 *
 * Les capacités natives sont résolues une seule fois, ici : le core lui-même ne
 * fait jamais `import` d'un module natif.
 */
export class VoxoClientDeps {
  readonly api: VoxoApiClient
  readonly sync: VoxoConversationSync
  readonly attachments: VoxoAttachmentQueue
  readonly sender: VoxoMessageSender
  readonly feedback: VoxoFeedbackService
  readonly realtime: VoxoRealtimeBinder
  readonly composer: VoxoComposer
  readonly push: VoxoPushRegistrar
  readonly typing: VoxoTypingSender
  readonly adapters: VoxoAdapters

  constructor(options: ClientDepsOptions) {
    const { config, state } = options

    this.adapters = {
      // Sans persistance demandée, un stockage en mémoire évite de charger
      // AsyncStorage pour rien.
      storage:
        config.adapters.storage ??
        (config.options.persistSession ? defaultStorage() : createMemoryStorage()),
      filePicker: config.adapters.filePicker ?? defaultFilePicker(),
      imageCompressor: config.adapters.imageCompressor ?? defaultImageCompressor(),
      linking: config.adapters.linking ?? defaultLinking(),
    }

    this.api = new VoxoApiClient(config, options.fetchImpl)

    this.sync = new VoxoConversationSync(
      this.api,
      new VoxoSocket(config, options.socketConnector),
      new VoxoSessionStore(config, this.adapters.storage),
      state,
      config,
    )

    this.push = new VoxoPushRegistrar(this.api, this.sync, config, () => state.sessionId)
    this.typing = new VoxoTypingSender({
      isEligible: options.isTypingEligible,
      send: (text) => this.sync.sendTyping(text),
    })

    this.attachments = new VoxoAttachmentQueue({
      api: this.api,
      config,
      picker: this.adapters.filePicker,
      compressor: this.adapters.imageCompressor,
      onChanged: options.onChanged,
      onError: options.onError,
    })

    this.sender = new VoxoMessageSender({
      api: this.api,
      config,
      state,
      rateLimiter: options.rateLimiter,
      onChanged: options.onChanged,
      onError: options.onError,
      onSessionReplaced: options.onSessionReplaced,
      userId: options.userId,
    })

    this.feedback = new VoxoFeedbackService({
      api: this.api,
      config,
      state,
      onChanged: options.onChanged,
      onError: options.onError,
    })

    this.realtime = new VoxoRealtimeBinder({
      sync: this.sync,
      config,
      state,
      onChanged: options.onChanged,
      onError: options.onError,
      onHandoff: options.onHandoff,
      onConnectivity: options.onConnectivity,
      onSystemMessage: options.onSystemMessage,
      isActive: options.isActive,
    })

    this.composer = new VoxoComposer({
      sender: this.sender,
      attachments: this.attachments,
      state,
      onChanged: options.onChanged,
      onError: options.onError,
      // Un envoi vaut signe de vie : la clôture automatique repart de zéro.
      onActivity: () => {
        this.realtime.touch()
        this.realtime.resetReminders()
      },
      onPersist: options.onPersist,
      ensureOpenSession: options.ensureOpenSession,
    })
  }
}
