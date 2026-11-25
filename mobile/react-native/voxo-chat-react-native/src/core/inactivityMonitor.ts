import { VoxoLimits } from './limits'

export interface InactivityMonitorOptions {
  /** Poste le message de relance dans le fil. */
  onReminder: () => void
  /** Poste le message annonçant la clôture. */
  onClosing: () => void
  /** Déclenche l'appel réseau de clôture. */
  onTimeout: () => Promise<void>
  /**
   * La surveillance ne tourne que si la conversation est ouverte et vivante :
   * pas de relance sur un chat fermé ou déjà terminé.
   */
  isActive: () => boolean
  delayMs?: number
  maxReminders?: number
  now?: () => number
}

/**
 * Relances puis clôture automatique d'une conversation laissée en silence.
 *
 * Reproduit le comportement du widget web : après 10 minutes sans activité, un
 * rappel est posté ; au troisième passage, un message de clôture est posté puis
 * la conversation est fermée via `POST /widget/conversation/:sessionId/timeout`.
 *
 * Le décompte se fait sur **l'horloge murale**, jamais sur le nombre de ticks :
 * React Native suspend les timers en arrière-plan, et un compteur de ticks
 * sous-estimerait le silence réel.
 *
 * Ce moniteur ne connaît ni le réseau ni l'UI : il appelle les rappels fournis.
 */
export class VoxoInactivityMonitor {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastActivity: number
  private reminders = 0

  private readonly delayMs: number
  private readonly maxReminders: number
  private readonly now: () => number

  constructor(private readonly options: InactivityMonitorOptions) {
    this.delayMs = options.delayMs ?? VoxoLimits.inactivityDelayMs
    this.maxReminders = options.maxReminders ?? VoxoLimits.maxInactivityReminders
    this.now = options.now ?? Date.now
    this.lastActivity = this.now()
  }

  get reminderCount(): number {
    return this.reminders
  }

  start(reminderCount = 0): void {
    this.reminders = reminderCount
    this.touch()
    this.stop()
    this.timer = setInterval(() => {
      void this.tick()
    }, VoxoLimits.inactivityTickMs)
  }

  /** À appeler à chaque signe de vie : saisie, envoi, ouverture du panneau. */
  touch(): void {
    this.lastActivity = this.now()
  }

  /** Remet le compteur de relances à zéro sans toucher à l'horloge. */
  resetReminders(): void {
    this.reminders = 0
  }

  /**
   * Évalue le silence écoulé. Exposé pour pouvoir être déclenché au retour de
   * l'application au premier plan, quand les timers ont été suspendus.
   */
  async tick(): Promise<void> {
    if (!this.options.isActive()) return
    if (this.now() - this.lastActivity <= this.delayMs) return

    // Les premières échéances relancent l'utilisateur.
    if (this.reminders < this.maxReminders - 1) {
      this.reminders += 1
      this.options.onReminder()
      this.touch()
      return
    }

    // L'avant-dernière annonce la clôture, qui suit immédiatement.
    if (this.reminders === this.maxReminders - 1) {
      this.reminders += 1
      this.options.onClosing()
      this.touch()
    }

    await this.options.onTimeout()
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }

  dispose(): void {
    this.stop()
  }
}
