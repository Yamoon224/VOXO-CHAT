import type { VoxoFeedback, VoxoMessage } from '../models/message'
import { createMessage } from '../models/message'
import type { FetchLike } from './apiClient'
import { VoxoClientDeps } from './clientDeps'
import type { VoxoClientSnapshot } from './clientSnapshot'
import { buildSnapshot, createViewState } from './clientSnapshot'
import type { VoxoConfig, VoxoConfigInput } from './config'
import { createConfig } from './config'
import { VoxoConversationState } from './conversationState'
import { VoxoRateLimiter } from './rateLimiter'
import type { VoxoArchivedView } from './conversationSync'
import type { VoxoPushPlatform } from './pushPlatform'
import type { VoxoArchivedConversation } from './sessionStore'
import { VoxoSessionLifecycle } from './sessionLifecycle'
import type { SocketConnector } from './socket'
import { VoxoStore } from './store'
import { voxoText } from '../i18n'

export interface VoxoClientInput extends VoxoConfigInput {
  /** Injectés par les tests ; jamais nécessaires en production. */
  fetchImpl?: FetchLike
  socketConnector?: SocketConnector
}

/**
 * Cerveau du SDK : état observable de la conversation et actions publiques.
 *
 * C'est le point d'entrée pour une UI maison — l'écran fourni par le SDK n'est
 * qu'un consommateur parmi d'autres. Ce client ne connaît ni React ni aucun
 * composant : il expose `subscribe` / `getSnapshot`, ce qu'attend
 * `useSyncExternalStore`.
 */
export class VoxoClient {
  readonly config: VoxoConfig

  private readonly state = new VoxoConversationState()
  private readonly rateLimiter = new VoxoRateLimiter()
  private readonly view = createViewState()
  private readonly deps: VoxoClientDeps
  private readonly lifecycle: VoxoSessionLifecycle
  private readonly store: VoxoStore<VoxoClientSnapshot>

  constructor(input: VoxoClientInput) {
    this.config = createConfig(input)

    this.deps = new VoxoClientDeps({
      config: this.config,
      state: this.state,
      rateLimiter: this.rateLimiter,
      onChanged: () => this.notify(),
      onError: (message) => this.reportError(message),
      onHandoff: (handoff) => this.apply(() => (this.view.handoff = handoff)),
      onConnectivity: (connectivity) => {
        if (this.view.connectivity === connectivity) return
        this.apply(() => (this.view.connectivity = connectivity))
      },
      onSystemMessage: (text) =>
        this.apply(() => {
          this.state.add(createMessage({ role: 'assistant', text }))
          void this.lifecycle.persist()
        }),
      onSessionReplaced: (previous) => this.lifecycle.adopt(previous),
      onPersist: () => this.lifecycle.persist(),
      ensureOpenSession: () => this.lifecycle.startNew(),
      userId: () => this.view.userId,
      isActive: () => this.view.active && !this.state.sessionEnded,
      isTypingEligible: () =>
        this.config.options.enableLiveTyping &&
        this.view.chatbot.features.liveTypingPreview &&
        this.view.handoff.status === 'human',
      fetchImpl: input.fetchImpl,
      socketConnector: input.socketConnector,
    })

    this.lifecycle = new VoxoSessionLifecycle({
      deps: this.deps,
      view: this.view,
      state: this.state,
      config: this.config,
      rateLimiter: this.rateLimiter,
      notify: () => this.notify(),
      isDisposed: () => this.store.isDisposed,
    })

    this.store = new VoxoStore(this.currentSnapshot())
  }

  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener)
  getSnapshot = (): VoxoClientSnapshot => this.store.getSnapshot()

  /** Prépare la conversation. Idempotent : un second appel est sans effet. */
  async init(): Promise<void> {
    const saved = await this.deps.adapters.storage.getItem(`locale-${this.config.tenantId}`)
    if (saved === 'fr' || saved === 'en') this.config.locale = saved
    return this.lifecycle.init()
  }

  /**
   * Signale que le chat est visible. L'inactivité n'est surveillée que dans ce
   * cas, comme sur le widget web.
   */
  setActive(active: boolean): void {
    this.view.active = active
    if (!active) return
    this.deps.realtime.touch()
    void this.deps.realtime.refreshConnectivity(true)
  }

  /**
   * Change la langue en cours de session, persiste le choix (clé
   * `locale-${tenantId}`) et redéclenche un rendu : tout ce qui est déjà
   * affiché passe dans la nouvelle langue.
   */
  setLocale(locale: 'fr' | 'en'): void {
    this.config.locale = locale
    void this.deps.adapters.storage.setItem(`locale-${this.config.tenantId}`, locale)
    this.notify()
  }

  /**
   * À appeler au retour de l'application au premier plan.
   *
   * iOS coupe les WebSockets en arrière-plan et suspend les timers : sans cette
   * reprise, une réponse de conseiller arrivée pendant la veille n'apparaîtrait
   * jamais.
   */
  resume(): Promise<void> {
    return this.deps.realtime.resume()
  }

  /** À appeler à chaque frappe pour repousser la clôture automatique. */
  notifyUserActivity(): void {
    this.deps.realtime.touch()
  }

  /** Envoie `text` avec les pièces jointes prêtes. */
  sendMessage(text: string): Promise<void> {
    // Efface l'aperçu chez le conseiller avant que le message n'arrive.
    this.deps.typing.submit('')
    return this.deps.composer.send(text)
  }

  /** À appeler à chaque modification du champ de saisie (aperçu de saisie, voir `CONTRACT.md`). */
  notifyTyping(text: string): void {
    this.deps.typing.submit(text)
  }

  /** Confie le jeton FCM/APNs obtenu par l'app hôte, lié à la session courante. */
  registerPushToken(token: string, platform: VoxoPushPlatform): Promise<void> {
    return this.deps.push.register(token, platform)
  }

  /** Oublie le jeton (déconnexion de l'utilisateur dans l'app hôte). */
  unregisterPushToken(): Promise<void> {
    return this.deps.push.unregister()
  }

  /** Conversation archivée en lecture seule ; la session active reste intacte. */
  archivedConversation(sessionId: string): Promise<VoxoArchivedView> {
    return this.deps.sync.loadArchived(sessionId)
  }

  /** Rejoue un message en échec, sans re-téléverser ses pièces jointes. */
  retry(messageId: string): Promise<void> {
    return this.deps.composer.retry(messageId)
  }

  /** Ouvre le sélecteur de fichiers et met les fichiers retenus en attente. */
  pickAttachments(): Promise<void> {
    return this.deps.attachments.pick()
  }

  removeAttachment(localId: string): void {
    this.deps.attachments.remove(localId)
  }

  /** Sans effet si le propriétaire a désactivé la fonctionnalité. */
  async submitFeedback(message: VoxoMessage, value: VoxoFeedback): Promise<void> {
    if (!this.view.chatbot.features.messageFeedback) return
    await this.deps.feedback.submitMessageFeedback(message, value)
    await this.lifecycle.persist()
  }

  /** Clôt la conversation avec une note de 1 à 5 et un commentaire facultatif. */
  async endConversation(rating?: number, feedback?: string): Promise<boolean> {
    const closed = await this.deps.feedback.endConversation(rating, feedback)
    if (closed) await this.lifecycle.persist()
    return closed
  }

  /** Archive la conversation courante et en ouvre une neuve. */
  startNewSession(): Promise<void> {
    return this.lifecycle.startNew()
  }

  /** Ouvre un lien issu d'une réponse, après filtrage des schémas. */
  async openLink(url: string): Promise<void> {
    if (!(await this.deps.adapters.linking.openUrl(url))) {
      this.reportError(voxoText(this.config.locale, 'linkOpenFailed'))
    }
  }

  /** Historique local des conversations terminées. */
  history(): Promise<VoxoArchivedConversation[]> {
    return this.deps.sync.history()
  }

  /**
   * Remonte un message destiné à l'utilisateur. Public pour qu'une UI maison
   * puisse signaler ses propres échecs par le même canal.
   */
  reportError(message: string): void {
    this.apply(() => (this.view.lastError = message))
  }

  clearError(): void {
    if (this.view.lastError === undefined) return
    this.apply(() => (this.view.lastError = undefined))
  }

  dispose(): void {
    this.deps.typing.dispose()
    this.deps.realtime.dispose()
    this.store.dispose()
  }

  private apply(mutate: () => void): void {
    mutate()
    this.notify()
  }

  private currentSnapshot(): VoxoClientSnapshot {
    return buildSnapshot({
      view: this.view,
      state: this.state,
      composer: this.deps.composer,
      attachments: this.deps.attachments,
    })
  }

  /**
   * Reconstruit l'instantané : c'est le changement de référence qui déclenche le
   * rendu côté React. `VoxoStore` ignore l'appel après mise au rebut, ce qui
   * couvre les requêtes lancées avant `dispose` et abouties après.
   */
  private notify(): void {
    this.store.setSnapshot(this.currentSnapshot())
  }
}
