package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.asList
import chat.voxo.sdk.models.asObject
import chat.voxo.sdk.models.bool
import chat.voxo.sdk.models.int
import chat.voxo.sdk.models.long
import chat.voxo.sdk.models.objects
import chat.voxo.sdk.models.string
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.time.Instant

/** Conversation terminée, conservée localement 30 jours (30 au plus). */
data class VoxoArchivedConversation(
    val sessionId: String,
    val title: String,
    val endedAt: Instant,
) {
    internal fun toJson(): JsonObject = buildJsonObject {
        put("sessionId", JsonPrimitive(sessionId))
        put("title", JsonPrimitive(title))
        put("endedAt", JsonPrimitive(endedAt.toString()))
    }

    internal companion object {
        fun fromJson(json: JsonObject) = VoxoArchivedConversation(
            sessionId = json.string("sessionId") ?: "",
            title = json.string("title") ?: "Conversation",
            endedAt = VoxoMessage.parseInstant(json.string("endedAt")) ?: Instant.now(),
        )
    }
}

/** Session restaurée au démarrage. */
internal class VoxoSessionSnapshot(
    val sessionId: String,
    val messages: List<VoxoMessage>,
    val messageCount: Int,
    val inactivityReminderCount: Int,
    val sessionEnded: Boolean,
    val conversationStartedAt: Instant?,
)

/**
 * Persistance de la session et de l'historique local. Clés suffixées par le
 * `tenantId` : plusieurs chatbots peuvent cohabiter dans une même application.
 */
internal class VoxoSessionStore(
    private val config: VoxoConfig,
    private val store: VoxoKeyValueStore,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val sessionKey get() = "session-${config.tenantId}"
    private val historyKey get() = "conversation-history-${config.tenantId}"
    private val localeKey get() = "locale-${config.tenantId}"
    private val pushKey get() = "push-token-${config.tenantId}"

    suspend fun userId(): String {
        config.user?.externalId?.takeIf { it.isNotEmpty() }?.let { return it }
        store.getString(USER_ID_KEY)?.takeIf { it.isNotEmpty() }?.let { return it }
        return "user-${VoxoUuid.v4()}".also { store.putString(USER_ID_KEY, it) }
    }

    suspend fun savedLocale(): String? = store.getString(localeKey)?.takeIf { it == "fr" || it == "en" }

    suspend fun saveLocale(locale: String) = store.putString(localeKey, locale)

    /** Dernier jeton de notification confié par l'app hôte : permet de le relier à chaque nouvelle session. */
    suspend fun savePushToken(platform: VoxoPushPlatform, token: String) {
        store.putString(pushKey, buildJsonObject { put("platform", JsonPrimitive(platform.wireName)); put("token", JsonPrimitive(token)) }.toString())
    }

    suspend fun loadPushToken(): Pair<VoxoPushPlatform, String>? {
        val json = decode(store.getString(pushKey)) ?: return null
        val platform = VoxoPushPlatform.entries.firstOrNull { it.wireName == json.string("platform") } ?: return null
        return json.string("token")?.takeIf { it.isNotEmpty() }?.let { platform to it }
    }

    suspend fun clearPushToken() = store.remove(pushKey)

    suspend fun save(state: VoxoConversationState, reminderCount: Int) {
        if (!config.options.persistSession) return
        // Seuls les derniers messages sont persistés : au-delà, le fil se recharge du serveur.
        val kept = state.messages.takeLast(VoxoLimits.MAX_PERSISTED_MESSAGES)
        val json = buildJsonObject {
            put("sessionId", JsonPrimitive(state.sessionId))
            put("messages", JsonArray(kept.map { it.toJson() }))
            put("lastActivity", JsonPrimitive(clock()))
            put("conversationStartedAt", state.conversationStartedAt?.let { JsonPrimitive(it.toString()) } ?: JsonNull)
            put("messageCount", JsonPrimitive(state.messageCount))
            put("inactivityReminderCount", JsonPrimitive(reminderCount))
            put("sessionEnded", JsonPrimitive(state.sessionEnded))
        }
        store.putString(sessionKey, json.toString())
    }

    /** `null` si rien à restaurer ; une session inactive depuis 30 min est archivée, pas restaurée. */
    suspend fun restore(): VoxoSessionSnapshot? {
        if (!config.options.persistSession) return null
        val decoded = decode(store.getString(sessionKey)) ?: return null
        val lastActivity = decoded.long("lastActivity") ?: return null

        val messages = decoded.objects("messages").map(VoxoMessage::fromJson)
        if (clock() - lastActivity >= VoxoLimits.sessionTimeout.inWholeMilliseconds) {
            archive(decoded.string("sessionId"), messages)
            store.remove(sessionKey)
            return null
        }
        return VoxoSessionSnapshot(
            sessionId = decoded.string("sessionId") ?: VoxoUuid.v4(),
            messages = messages,
            messageCount = decoded.int("messageCount") ?: 0,
            inactivityReminderCount = decoded.int("inactivityReminderCount") ?: 0,
            sessionEnded = decoded.bool("sessionEnded") ?: false,
            conversationStartedAt = VoxoMessage.parseInstant(decoded.string("conversationStartedAt")),
        )
    }

    suspend fun archive(sessionId: String?, messages: List<VoxoMessage>) {
        if (sessionId.isNullOrEmpty() || messages.isEmpty()) return
        // Le premier message de l'utilisateur sert de titre, comme dans le widget.
        val title = messages.firstOrNull { it.isFromUser && it.text.isNotEmpty() }?.text ?: "Conversation"
        val entries = history().filter { it.sessionId != sessionId }.toMutableList()
        entries.add(0, VoxoArchivedConversation(sessionId, title.take(80), Instant.ofEpochMilli(clock())))
        val kept = entries.take(VoxoLimits.MAX_ARCHIVED_CONVERSATIONS)
        store.putString(historyKey, JsonArray(kept.map { it.toJson() }).toString())
    }

    suspend fun history(): List<VoxoArchivedConversation> {
        val raw = store.getString(historyKey) ?: return emptyList()
        val list = runCatching { Json.parseToJsonElement(raw) }.getOrNull().asList() ?: return emptyList()
        val cutoff = Instant.ofEpochMilli(clock() - VoxoLimits.historyRetention.inWholeMilliseconds)
        return list.mapNotNull { it.asObject() }
            .map(VoxoArchivedConversation::fromJson)
            .filter { it.endedAt.isAfter(cutoff) }
    }

    private fun decode(raw: String?): JsonObject? =
        raw?.let { runCatching { Json.parseToJsonElement(it) }.getOrNull().asObject() }

    private companion object {
        const val USER_ID_KEY = "user-id"
    }
}
