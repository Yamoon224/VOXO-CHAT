import type { VoxoChatbotConfig } from '../models/chatbotConfig'
import { chatbotConfigFromApi, defaultChatbotConfig } from '../models/chatbotConfig'
import type { VoxoHandoff } from '../models/handoff'
import { handoffFromApi } from '../models/handoff'
import type { VoxoMessage } from '../models/message'
import { createMessage, messageFromHistory } from '../models/message'
import type { VoxoApiClient } from './apiClient'
import type { VoxoConfig } from './config'
import type { VoxoConnectivity, VoxoConversationState } from './conversationState'
import { isJsonObject, objectAt, stringArrayAt } from './envelope'
import { VoxoError } from './errors'
import { VoxoLimits } from './limits'
import type { VoxoArchivedConversation, VoxoSessionStore } from './sessionStore'
import type { VoxoPushPlatform } from './pushPlatform'
import type { VoxoSocket, VoxoSocketEvent } from './socket'
import { voxoText } from '../i18n'

/** Conversation archivée rouverte en **lecture seule** (voir `CONTRACT.md`). */
export interface VoxoArchivedView {
  messages: VoxoMessage[]
  handoff: VoxoHandoff
}

/**
 * Tout ce qui synchronise l'état local avec le serveur et le stockage.
 *
 * Extrait du client pour que celui-ci reste lisible : ici, la configuration
 * distante, l'historique, la persistance, le flux temps réel et la sonde de
 * connectivité. Aucune décision d'UI n'est prise dans ce fichier.
 */
export class VoxoConversationSync {
  private lastHealthCheck: number | null = null

  constructor(
    private readonly api: VoxoApiClient,
    private readonly socket: VoxoSocket,
    private readonly store: VoxoSessionStore,
    private readonly state: VoxoConversationState,
    readonly config: VoxoConfig,
  ) {}

  onSocketEvent(listener: (event: VoxoSocketEvent) => void): () => void {
    return this.socket.onEvent(listener)
  }

  connectSocket(): void {
    this.socket.open(this.state.sessionId)
  }

  /** Aperçu de saisie : `false` si le socket n'est pas ouvert. */
  sendTyping(text: string): boolean {
    return this.socket.sendTyping(text)
  }

  disposeSocket(): void {
    this.socket.dispose()
  }

  userId(): Promise<string> {
    return this.store.userId()
  }

  /**
   * Recharge la session persistée et renvoie le nombre de relances d'inactivité
   * déjà émises, pour reprendre le décompte là où il s'était arrêté. Sans
   * session fraîche, l'état reste celui d'une conversation neuve.
   */
  async restore(): Promise<number> {
    const snapshot = await this.store.restore()
    if (snapshot === null) return 0

    this.state.sessionId = snapshot.sessionId
    this.state.messages = snapshot.messages
    this.state.messageCount = snapshot.messageCount
    this.state.conversationStartedAt = snapshot.conversationStartedAt
    this.state.sessionEnded = snapshot.sessionEnded
    return snapshot.inactivityReminderCount
  }

  /**
   * Charge la configuration décidée par le propriétaire du chatbot. En cas
   * d'échec, on garde les valeurs par défaut : un thème générique vaut mieux
   * qu'un écran vide.
   */
  async loadConfig(): Promise<{ chatbot: VoxoChatbotConfig; connectivity: VoxoConnectivity }> {
    try {
      const data = await this.api.getConfig()
      const chatbot = objectAt(data, 'chatbot')
      return {
        chatbot: isJsonObject(data.chatbot)
          ? chatbotConfigFromApi(chatbot, this.config.locale)
          : defaultChatbotConfig(this.config.locale),
        connectivity: 'available',
      }
    } catch {
      return { chatbot: defaultChatbotConfig(this.config.locale), connectivity: 'unavailable' }
    }
  }

  /**
   * Suggestions de démarrage. Une indisponibilité n'est pas bloquante : le
   * message d'accueil s'affiche sans réponses rapides.
   */
  async quickReplies(): Promise<string[]> {
    try {
      return stringArrayAt(await this.api.getQuickReplies(), 'suggestions')
    } catch {
      return []
    }
  }

  /**
   * Compose le message d'accueil : texte défini par le propriétaire, accompagné
   * des suggestions de démarrage. Produit **localement** — le serveur ne le
   * connaît pas et ne le renverra jamais dans l'historique.
   */
  async buildWelcomeMessage(chatbot: VoxoChatbotConfig): Promise<VoxoMessage> {
    return createMessage({
      role: 'assistant',
      text: chatbot.welcomeMessage,
      suggestions: await this.quickReplies(),
      isWelcome: true,
    })
  }

  /**
   * Recharge le fil depuis le serveur et renvoie l'état de reprise humaine.
   *
   * Un `404` est le cas **normal** d'une session neuve : la conversation
   * n'existe pas encore côté serveur. On renvoie `null` sans rien changer, et
   * surtout sans remonter d'erreur à l'utilisateur.
   */
  async syncHistory(): Promise<VoxoHandoff | null> {
    try {
      const data = await this.api.getConversation(this.state.sessionId)
      const rawMessages = data.messages
      if (Array.isArray(rawMessages)) {
        const history: VoxoMessage[] = rawMessages.filter(isJsonObject).map(messageFromHistory)
        this.state.replaceWithHistory(history)
      }
      return handoffFromApi(data)
    } catch (error) {
      if (error instanceof VoxoError && error.isNotFound) return null
      throw error
    }
  }

  /**
   * Relit une conversation archivée **sans toucher** à la session active. Une
   * conversation purgée côté serveur (404) devient « Historique indisponible »,
   * jamais une erreur technique.
   */
  async loadArchived(sessionId: string): Promise<VoxoArchivedView> {
    try {
      const data = await this.api.getConversation(sessionId, 100)
      const raw = data.messages
      return {
        // Dédoublonné par id : l'UI s'en sert comme clé de liste.
        messages: Array.isArray(raw) ? uniqueById(raw.filter(isJsonObject).map(messageFromHistory)) : [],
        handoff: handoffFromApi(data),
      }
    } catch (error) {
      if (error instanceof VoxoError && error.isNotFound) {
        throw new VoxoError(voxoText(this.config.locale, 'historyUnavailable'), {
          code: 'HISTORY_UNAVAILABLE',
          statusCode: 404,
        })
      }
      throw error
    }
  }

  savePushToken(platform: VoxoPushPlatform, token: string): Promise<void> {
    return this.store.savePushToken(platform, token)
  }

  loadPushToken(): Promise<{ platform: VoxoPushPlatform; value: string } | null> {
    return this.store.loadPushToken()
  }

  clearPushToken(): Promise<void> {
    return this.store.clearPushToken()
  }

  persist(reminderCount: number): Promise<void> {
    return this.store.save({
      sessionId: this.state.sessionId,
      messages: this.state.messages,
      messageCount: this.state.messageCount,
      inactivityReminderCount: reminderCount,
      sessionEnded: this.state.sessionEnded,
      conversationStartedAt: this.state.conversationStartedAt,
      user: this.config.user,
    })
  }

  archive(sessionId: string, messages: VoxoMessage[]): Promise<void> {
    return this.store.archive(sessionId, messages)
  }

  history(): Promise<VoxoArchivedConversation[]> {
    return this.store.history()
  }

  /** Clôture après relances d'inactivité. Le motif est imposé par la route. */
  async endForInactivity(): Promise<void> {
    await this.api.endConversationForInactivity(
      this.state.sessionId,
      this.state.durationMs,
      this.state.messageCount,
    )
  }

  /** Sonde `GET /widget/health`, au plus une fois par minute sauf `force`. */
  async checkConnectivity(force = false): Promise<VoxoConnectivity | null> {
    const now = Date.now()
    if (
      !force &&
      this.lastHealthCheck !== null &&
      now - this.lastHealthCheck < VoxoLimits.healthCheckIntervalMs
    ) {
      return null
    }
    this.lastHealthCheck = now
    return (await this.api.isHealthy()) ? 'available' : 'unavailable'
  }
}

function uniqueById(messages: VoxoMessage[]): VoxoMessage[] {
  const seen = new Set<string>()
  return messages.filter((message) => !seen.has(message.id) && !!seen.add(message.id))
}
