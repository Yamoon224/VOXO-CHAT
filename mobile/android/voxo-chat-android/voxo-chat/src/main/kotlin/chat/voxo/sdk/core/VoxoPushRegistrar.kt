package chat.voxo.sdk.core

/**
 * Relie le jeton de notification de l'appareil à la session courante (voir CONTRACT.md,
 * `POST /widget/push-token`). Au mieux : une panne ou un refus ne remonte jamais à l'utilisateur, la
 * session suivante réessaie. `PUSH_NOT_ENABLED` (le propriétaire n'a rien configuré) coupe les tentatives
 * jusqu'au prochain jeton confié.
 */
internal class VoxoPushRegistrar(
    private val api: VoxoApiClient,
    private val sync: VoxoConversationSync,
    private val config: VoxoConfig,
    private val sessionId: () -> String,
) {
    private var token: Pair<VoxoPushPlatform, String>? = null
    private var disabledByOwner = false

    suspend fun load() {
        token = sync.loadPushToken()
    }

    suspend fun register(token: String, platform: VoxoPushPlatform) {
        this.token = platform to token
        sync.savePushToken(platform, token)
        disabledByOwner = false
        syncSession()
    }

    suspend fun unregister() {
        val (_, current) = token ?: return
        token = null
        sync.clearPushToken()
        runCatching { api.unregisterPushToken(current) }
    }

    /** À appeler après chaque changement de session : un jeton n'est lié qu'à une session à la fois. */
    suspend fun syncSession() {
        val (platform, current) = token ?: return
        if (disabledByOwner) return
        try {
            api.registerPushToken(sessionId(), current, platform.wireName, config.locale)
        } catch (error: VoxoException) {
            if (error.code == "PUSH_NOT_ENABLED") disabledByOwner = true
        }
    }
}
