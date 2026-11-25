package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.asObject
import chat.voxo.sdk.models.objects
import chat.voxo.sdk.models.strings
import kotlinx.coroutines.flow.SharedFlow

/**
 * Orchestration de la synchronisation : config distante, historique, session
 * locale, connectivité. Regroupe ce qui touche au serveur ET au stockage pour
 * que le controller n'ait qu'un interlocuteur.
 */
internal class VoxoConversationSync(
    private val api: VoxoApiClient,
    private val socket: VoxoSocket,
    private val store: VoxoSessionStore,
    private val state: VoxoConversationState,
    val config: VoxoConfig,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private var lastHealthCheck: Long? = null

    val events: SharedFlow<VoxoSocketEvent> get() = socket.events

    fun connectSocket() = socket.connect(state.sessionId)

    fun disposeSocket() = socket.dispose()

    suspend fun userId(): String = store.userId()

    suspend fun restoreLocale() {
        store.savedLocale()?.let { config.locale = it }
    }

    suspend fun saveLocale() = store.saveLocale(config.locale)

    /** Restaure la session locale ; renvoie le nombre de relances d'inactivité déjà faites. */
    suspend fun restore(): Int {
        val snapshot = store.restore() ?: return 0
        state.sessionId = snapshot.sessionId
        state.messages.clear()
        state.messages.addAll(snapshot.messages)
        state.messageCount = snapshot.messageCount
        state.conversationStartedAt = snapshot.conversationStartedAt
        state.sessionEnded = snapshot.sessionEnded
        return snapshot.inactivityReminderCount
    }

    /** Une panne de config ne bloque pas le chat : valeurs par défaut + service indisponible. */
    suspend fun loadConfig(): Pair<VoxoChatbotConfig, VoxoConnectivity> = try {
        val chatbot = api.getConfig()["chatbot"].asObject()
        val parsed = chatbot?.let { VoxoChatbotConfig.fromJson(it, config.locale) }
            ?: VoxoChatbotConfig(welcomeMessage = VoxoI18n.text(config.locale, "defaultWelcome"))
        parsed to VoxoConnectivity.AVAILABLE
    } catch (_: VoxoException) {
        VoxoChatbotConfig(welcomeMessage = VoxoI18n.text(config.locale, "defaultWelcome")) to
            VoxoConnectivity.UNAVAILABLE
    }

    suspend fun quickReplies(): List<String> = try {
        api.getQuickReplies().strings("suggestions")
    } catch (_: VoxoException) {
        emptyList()
    }

    /**
     * Recharge l'historique. `404` = session neuve : pas d'historique, pas d'erreur
     * (renvoie null). Les autres erreurs remontent.
     */
    suspend fun syncHistory(): VoxoHandoff? = try {
        val data = api.getConversation(state.sessionId)
        if (data["messages"] != null) {
            state.replaceWithHistory(data.objects("messages").map(VoxoMessage::fromHistory))
        }
        VoxoHandoff.fromJson(data)
    } catch (error: VoxoException) {
        if (error.isNotFound) null else throw error
    }

    suspend fun savePushToken(platform: VoxoPushPlatform, token: String) = store.savePushToken(platform, token)

    suspend fun loadPushToken(): Pair<VoxoPushPlatform, String>? = store.loadPushToken()

    suspend fun clearPushToken() = store.clearPushToken()

    /**
     * Relit une conversation archivée **sans toucher** à la session active. Une conversation purgée côté
     * serveur (404) devient « Historique indisponible », jamais une erreur technique.
     */
    suspend fun loadArchived(sessionId: String): VoxoArchivedView = try {
        val data = api.getConversation(sessionId, limit = 100)
        // Dédoublonné par id : l'UI s'en sert comme clé de liste.
        VoxoArchivedView(data.objects("messages").map(VoxoMessage::fromHistory).distinctBy { it.id }, VoxoHandoff.fromJson(data))
    } catch (error: VoxoException) {
        if (error.isNotFound) {
            throw VoxoException(VoxoI18n.text(config.locale, "historyUnavailable"), code = "HISTORY_UNAVAILABLE", statusCode = 404)
        }
        throw error
    }

    suspend fun persist(reminderCount: Int) = store.save(state, reminderCount)

    suspend fun archive(sessionId: String, messages: List<VoxoMessage>) = store.archive(sessionId, messages)

    suspend fun history(): List<VoxoArchivedConversation> = store.history()

    suspend fun endForInactivity() {
        api.endConversationForInactivity(state.sessionId, state.durationMs, state.messageCount)
    }

    /** `null` si une sonde récente rend celle-ci inutile (~1 appel/minute maximum). */
    suspend fun checkConnectivity(force: Boolean = false): VoxoConnectivity? {
        val now = clock()
        val last = lastHealthCheck
        if (!force && last != null && now - last < VoxoLimits.healthCheckInterval.inWholeMilliseconds) return null
        lastHealthCheck = now
        return if (api.isHealthy()) VoxoConnectivity.AVAILABLE else VoxoConnectivity.UNAVAILABLE
    }
}
