import { NO_HANDOFF } from '../models/handoff'
import type { VoxoClientDeps } from './clientDeps'
import type { VoxoViewState } from './clientSnapshot'
import type { VoxoConfig } from './config'
import type { VoxoConversationState } from './conversationState'
import type { VoxoRateLimiter } from './rateLimiter'

export interface SessionLifecycleOptions {
  deps: VoxoClientDeps
  view: VoxoViewState
  state: VoxoConversationState
  config: VoxoConfig
  rateLimiter: VoxoRateLimiter
  notify: () => void
  /** Une requête peut aboutir après la mise au rebut : on s'arrête alors. */
  isDisposed: () => boolean
}

/**
 * Cycle de vie de la session : démarrage, ouverture d'une session neuve,
 * bascule imposée par le serveur, persistance.
 *
 * Séparé du client, qui expose l'API publique : ici on ne s'occupe que de
 * *quand* une conversation commence, se termine et se sauvegarde.
 */
export class VoxoSessionLifecycle {
  constructor(private readonly options: SessionLifecycleOptions) {}

  /**
   * Prépare la conversation : identité, session restaurée, configuration
   * distante, message d'accueil, flux temps réel. Idempotent.
   */
  async init(): Promise<void> {
    const { deps, view, state, config, notify, isDisposed } = this.options
    if (view.ready || isDisposed()) return

    view.userId = await deps.sync.userId()
    const reminderCount = await deps.sync.restore()

    const { chatbot, connectivity } = await deps.sync.loadConfig()
    if (isDisposed()) return
    view.chatbot = chatbot
    view.connectivity = connectivity
    deps.attachments.applyServerLimits(chatbot.maxAttachments, chatbot.maxAttachmentBytes)

    if (state.isEmpty) await this.addWelcomeMessage()
    if (isDisposed()) return

    deps.realtime.start(reminderCount, config.options.enableInactivityMonitor)
    // Le fil réel fait foi sur ce qui a été restauré localement : un agent a pu
    // répondre pendant que l'application était fermée.
    void deps.realtime.refreshHistory()

    await deps.push.load()
    await deps.push.syncSession()

    view.ready = true
    notify()
  }

  /** Archive la conversation courante et en ouvre une neuve. */
  async startNew(): Promise<void> {
    const { deps, view, state, rateLimiter, notify } = this.options

    await deps.sync.archive(state.sessionId, state.messages)
    state.reset()
    rateLimiter.reset()
    view.handoff = NO_HANDOFF
    deps.realtime.reconnect()
    await this.addWelcomeMessage()
    await this.persist()
    await deps.push.syncSession()
    notify()
  }

  /**
   * Le serveur a basculé la conversation sur une session neuve : l'ancienne part
   * à l'archive et le flux temps réel suit la nouvelle.
   */
  async adopt(previousSessionId: string): Promise<void> {
    const { deps, state } = this.options
    await deps.sync.archive(previousSessionId, state.messages)
    deps.realtime.reconnect()
    await deps.push.syncSession()
  }

  persist(): Promise<void> {
    return this.options.deps.sync.persist(this.options.deps.realtime.reminderCount)
  }

  private async addWelcomeMessage(): Promise<void> {
    const { deps, view, state, notify, isDisposed } = this.options
    if (!state.isEmpty) return

    const welcome = await deps.sync.buildWelcomeMessage(view.chatbot)
    // Le fil a pu se remplir pendant l'aller-retour des suggestions.
    if (isDisposed() || !state.isEmpty) return

    state.add(welcome)
    notify()
  }
}
