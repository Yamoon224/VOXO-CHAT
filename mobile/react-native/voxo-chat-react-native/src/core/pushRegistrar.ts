import type { VoxoApiClient } from './apiClient'
import type { VoxoConfig } from './config'
import type { VoxoConversationSync } from './conversationSync'
import { VoxoError } from './errors'
import type { VoxoPushPlatform } from './pushPlatform'

/**
 * Relie le jeton de notification de l'appareil à la session courante (voir
 * `CONTRACT.md`, `POST /widget/push-token`). Au mieux : une panne ou un refus ne
 * remonte jamais à l'utilisateur, la session suivante réessaie.
 * `PUSH_NOT_ENABLED` (le propriétaire n'a rien configuré) coupe les tentatives
 * jusqu'au prochain jeton confié.
 */
export class VoxoPushRegistrar {
  private token: { platform: VoxoPushPlatform; value: string } | null = null
  private disabledByOwner = false

  constructor(
    private readonly api: VoxoApiClient,
    private readonly sync: VoxoConversationSync,
    private readonly config: VoxoConfig,
    private readonly sessionId: () => string,
  ) {}

  async load(): Promise<void> {
    this.token = await this.sync.loadPushToken()
  }

  async register(token: string, platform: VoxoPushPlatform): Promise<void> {
    this.token = { platform, value: token }
    try {
      await this.sync.savePushToken(platform, token)
    } catch {
      // Stockage indisponible : le jeton reste en mémoire pour cette exécution.
    }
    this.disabledByOwner = false
    await this.syncSession()
  }

  async unregister(): Promise<void> {
    const current = this.token
    if (current === null) return
    this.token = null
    try {
      await this.sync.clearPushToken()
      await this.api.unregisterPushToken(current.value)
    } catch {
      // Au mieux : le serveur purgera un jeton devenu invalide.
    }
  }

  /** À appeler après chaque changement de session : un jeton n'est lié qu'à une session à la fois. */
  async syncSession(): Promise<void> {
    const current = this.token
    if (current === null || this.disabledByOwner) return
    try {
      await this.api.registerPushToken(
        this.sessionId(),
        current.value,
        current.platform,
        this.config.locale,
      )
    } catch (error) {
      if (error instanceof VoxoError && error.code === 'PUSH_NOT_ENABLED') {
        this.disabledByOwner = true
      }
    }
  }
}
