import type { VoxoStorage } from '../adapters/types'
import type { VoxoMessage } from '../models/message'
import { messageFromJson, messageToJson } from '../models/message'
import type { VoxoConfig, VoxoUser } from './config'
import type { JsonObject } from './envelope'
import { isJsonObject, numberAt, stringAt } from './envelope'
import { VoxoLimits } from './limits'
import type { VoxoPushPlatform } from './pushPlatform'
import { uuidV4 } from './uuid'

/** Conversation terminée, gardée pour l'écran d'historique. */
export interface VoxoArchivedConversation {
  sessionId: string
  title: string
  /** Millisecondes depuis l'époque. */
  endedAt: number
}

/** État de session restauré au démarrage. */
export interface VoxoSessionSnapshot {
  sessionId: string
  messages: VoxoMessage[]
  messageCount: number
  inactivityReminderCount: number
  sessionEnded: boolean
  conversationStartedAt?: number
  user?: VoxoUser
}

/**
 * Persistance locale de la session.
 *
 * Les clés reprennent celles du widget web (`session-{tenantId}`,
 * `conversation-history-{tenantId}`, `user-profile-{tenantId}`, `user-id`) pour
 * que le contrat reste lisible d'un canal à l'autre. Ce store ne fait aucun
 * appel réseau : il ne connaît qu'un `VoxoStorage`.
 */
export class VoxoSessionStore {
  constructor(
    private readonly config: VoxoConfig,
    private readonly storage: VoxoStorage,
  ) {}

  private get sessionKey(): string {
    return `session-${this.config.tenantId}`
  }

  private get historyKey(): string {
    return `conversation-history-${this.config.tenantId}`
  }

  private get profileKey(): string {
    return `user-profile-${this.config.tenantId}`
  }

  private get pushKey(): string {
    return `push-token-${this.config.tenantId}`
  }

  private static readonly userIdKey = 'user-id'

  /**
   * Identifiant anonyme stable, généré une fois puis conservé. Un `externalId`
   * fourni par l'application hôte le remplace.
   */
  async userId(): Promise<string> {
    const external = this.config.user?.externalId
    if (external) return external

    const existing = await this.storage.getItem(VoxoSessionStore.userIdKey)
    if (existing) return existing

    const generated = `user-${uuidV4()}`
    await this.storage.setItem(VoxoSessionStore.userIdKey, generated)
    return generated
  }

  async save(snapshot: Omit<VoxoSessionSnapshot, 'user'> & { user?: VoxoUser }): Promise<void> {
    if (!this.config.options.persistSession) return

    // Seuls les derniers messages sont persistés : au-delà, le fil se recharge
    // depuis le serveur.
    const messages = snapshot.messages.slice(-VoxoLimits.maxPersistedMessages)

    await this.storage.setItem(
      this.sessionKey,
      JSON.stringify({
        sessionId: snapshot.sessionId,
        messages: messages.map(messageToJson),
        lastActivity: Date.now(),
        conversationStartedAt: snapshot.conversationStartedAt ?? null,
        messageCount: snapshot.messageCount,
        inactivityReminderCount: snapshot.inactivityReminderCount,
        sessionEnded: snapshot.sessionEnded,
        user: snapshot.user ?? null,
      }),
    )
  }

  /**
   * Restaure la session si elle est encore fraîche. Au-delà de 30 minutes
   * d'inactivité, elle est archivée et `null` est renvoyé : l'utilisateur repart
   * sur une conversation neuve.
   */
  async restore(): Promise<VoxoSessionSnapshot | null> {
    if (!this.config.options.persistSession) return null

    const decoded = await this.readObject(this.sessionKey)
    const lastActivity = decoded ? numberAt(decoded, 'lastActivity') : undefined
    if (!decoded || lastActivity === undefined) return null

    const rawMessages = decoded.messages
    const messages = Array.isArray(rawMessages)
      ? rawMessages.filter(isJsonObject).map(messageFromJson)
      : []

    if (Date.now() - lastActivity >= VoxoLimits.sessionTimeoutMs) {
      await this.archive(stringAt(decoded, 'sessionId'), messages)
      await this.storage.removeItem(this.sessionKey)
      return null
    }

    const user = decoded.user
    return {
      sessionId: stringAt(decoded, 'sessionId') ?? uuidV4(),
      messages,
      messageCount: numberAt(decoded, 'messageCount') ?? 0,
      inactivityReminderCount: numberAt(decoded, 'inactivityReminderCount') ?? 0,
      sessionEnded: decoded.sessionEnded === true,
      conversationStartedAt: numberAt(decoded, 'conversationStartedAt'),
      user: isJsonObject(user) ? (user as VoxoUser) : undefined,
    }
  }

  /** Dernier jeton de notification confié par l'app hôte : permet de le relier à chaque nouvelle session. */
  async savePushToken(platform: VoxoPushPlatform, token: string): Promise<void> {
    await this.storage.setItem(this.pushKey, JSON.stringify({ platform, token }))
  }

  async loadPushToken(): Promise<{ platform: VoxoPushPlatform; value: string } | null> {
    const decoded = await this.readObject(this.pushKey)
    if (!decoded) return null
    const platform = decoded.platform
    const token = stringAt(decoded, 'token')
    if ((platform !== 'fcm' && platform !== 'apns') || !token) return null
    return { platform, value: token }
  }

  async clearPushToken(): Promise<void> {
    await this.storage.removeItem(this.pushKey)
  }

  async clearSession(): Promise<void> {
    await this.storage.removeItem(this.sessionKey)
  }

  /**
   * Range une conversation dans l'historique local. Sans message, il n'y a rien
   * à archiver.
   */
  async archive(sessionId: string | undefined, messages: VoxoMessage[]): Promise<void> {
    if (!sessionId || messages.length === 0) return

    // Le premier message de l'utilisateur sert de titre, comme dans le widget.
    const firstUserText = messages.find(
      (message) => message.role === 'user' && message.text.length > 0,
    )?.text
    const title = (firstUserText ?? 'Conversation').slice(0, 80)

    const entries = (await this.history()).filter((item) => item.sessionId !== sessionId)
    entries.unshift({ sessionId, title, endedAt: Date.now() })

    await this.storage.setItem(
      this.historyKey,
      JSON.stringify(entries.slice(0, VoxoLimits.maxArchivedConversations)),
    )
  }

  /** Historique local, purgé des conversations de plus de 30 jours. */
  async history(): Promise<VoxoArchivedConversation[]> {
    const raw = await this.storage.getItem(this.historyKey)
    if (!raw) return []

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []

    const cutoff = Date.now() - VoxoLimits.historyRetentionMs
    return parsed
      .filter(isJsonObject)
      .map((item) => ({
        sessionId: stringAt(item, 'sessionId') ?? '',
        title: stringAt(item, 'title') ?? 'Conversation',
        endedAt: numberAt(item, 'endedAt') ?? 0,
      }))
      .filter((item) => item.sessionId.length > 0 && item.endedAt > cutoff)
  }

  async saveUser(user: VoxoUser): Promise<void> {
    await this.storage.setItem(this.profileKey, JSON.stringify(user))
  }

  async restoreUser(): Promise<VoxoUser | undefined> {
    if (this.config.user) return this.config.user
    const decoded = await this.readObject(this.profileKey)
    return decoded ? (decoded as VoxoUser) : undefined
  }

  private async readObject(key: string): Promise<JsonObject | null> {
    const raw = await this.storage.getItem(key)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isJsonObject(parsed) ? parsed : null
    } catch {
      return null
    }
  }
}
