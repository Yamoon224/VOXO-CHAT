import type { VoxoHandoff } from '../models/handoff'
import { messageFromHistory } from '../models/message'
import type { VoxoConfig } from './config'
import type { VoxoConnectivity, VoxoConversationState } from './conversationState'
import type { VoxoConversationSync } from './conversationSync'
import { VoxoError } from './errors'
import { voxoText } from '../i18n'
import { VoxoInactivityMonitor } from './inactivityMonitor'
import type { VoxoSocketEvent } from './socket'
import { isAgentMessage, isSyncEvent } from './socket'

export interface RealtimeBinderOptions {
  sync: VoxoConversationSync
  config: VoxoConfig
  state: VoxoConversationState
  onChanged: () => void
  onError: (message: string) => void
  onHandoff: (handoff: VoxoHandoff) => void
  onConnectivity: (connectivity: VoxoConnectivity) => void
  /** Poste un message de l'assistant produit localement (relance d'inactivité). */
  onSystemMessage: (text: string) => void
  /**
   * La surveillance d'inactivité ne tourne que sur une conversation ouverte et
   * encore vivante.
   */
  isActive: () => boolean
}

/**
 * Branche les signaux extérieurs — flux temps réel, inactivité, santé du
 * service — sur l'état de la conversation.
 *
 * Le client expose une API publique ; ce binder traduit ce qui arrive tout seul.
 * Il ne décide de rien : il applique et prévient via ses rappels.
 */
export class VoxoRealtimeBinder {
  private unsubscribe: (() => void) | null = null
  private inactivity: VoxoInactivityMonitor | null = null

  constructor(private readonly options: RealtimeBinderOptions) {}

  get reminderCount(): number {
    return this.inactivity?.reminderCount ?? 0
  }

  /**
   * Branche le flux temps réel, et la surveillance d'inactivité si
   * `enableInactivity` — l'application hôte peut préférer gérer elle-même le
   * cycle de vie de la conversation.
   */
  start(reminderCount = 0, enableInactivity = true): void {
    this.unsubscribe ??= this.options.sync.onSocketEvent((event) => {
      void this.handle(event)
    })
    this.options.sync.connectSocket()

    if (!enableInactivity) return

    this.inactivity ??= new VoxoInactivityMonitor({
      onReminder: () =>
        this.options.onSystemMessage(voxoText(this.options.config.locale, 'inactivityReminder')),
      onClosing: () =>
        this.options.onSystemMessage(voxoText(this.options.config.locale, 'inactivityClosing')),
      onTimeout: () => this.closeForInactivity(),
      isActive: this.options.isActive,
    })
    this.inactivity.start(reminderCount)
  }

  touch(): void {
    this.inactivity?.touch()
  }

  resetReminders(): void {
    this.inactivity?.resetReminders()
  }

  /** Rebranche le flux sur une nouvelle session. */
  reconnect(): void {
    this.options.sync.connectSocket()
    this.inactivity?.resetReminders()
  }

  /**
   * À appeler au retour de l'application au premier plan.
   *
   * iOS coupe les WebSockets en arrière-plan et suspend les timers : sans cette
   * reprise, une réponse de conseiller arrivée pendant la mise en veille
   * n'apparaîtrait jamais.
   */
  async resume(): Promise<void> {
    this.options.sync.connectSocket()
    await Promise.all([this.refreshHistory(), this.refreshConnectivity(true)])
    await this.inactivity?.tick()
  }

  private async handle(event: VoxoSocketEvent): Promise<void> {
    if (event.handoff) this.options.onHandoff(event.handoff)

    // Le serveur signale que le fil a bougé hors de notre vue : on le recharge
    // plutôt que de tenter une fusion partielle.
    if (isSyncEvent(event)) {
      await this.refreshHistory()
      return
    }

    if (!isAgentMessage(event) || !event.message) return

    const message = messageFromHistory(event.message)
    // Un même message peut arriver deux fois : reconnexion, resynchronisation.
    if (this.options.state.hasServerId(message.serverId)) return
    this.options.state.add(message)
    this.options.onChanged()
  }

  /**
   * Recharge l'historique depuis le serveur. Une session encore inconnue du
   * serveur (404) laisse l'état intact, sans erreur affichée.
   */
  async refreshHistory(): Promise<void> {
    try {
      const handoff = await this.options.sync.syncHistory()
      if (handoff) this.options.onHandoff(handoff)
      this.options.onChanged()
    } catch (error) {
      if (error instanceof VoxoError) this.options.onError(error.message)
    }
  }

  /** Sonde la disponibilité du service, au plus une fois par minute sauf `force`. */
  async refreshConnectivity(force = false): Promise<void> {
    const result = await this.options.sync.checkConnectivity(force)
    if (result !== null) this.options.onConnectivity(result)
  }

  private async closeForInactivity(): Promise<void> {
    try {
      await this.options.sync.endForInactivity()
      this.options.state.sessionEnded = true
      await this.options.sync.archive(this.options.state.sessionId, this.options.state.messages)
      this.options.onChanged()
    } catch {
      this.options.onError(voxoText(this.options.config.locale, 'autoCloseFailed'))
    }
  }

  dispose(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.inactivity?.dispose()
    this.options.sync.disposeSocket()
  }
}
