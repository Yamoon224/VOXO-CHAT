package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.asObject
import chat.voxo.sdk.models.string
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

/** Événement reçu sur le socket : voir « WebSocket » dans `mobile/CONTRACT.md`. */
internal class VoxoSocketEvent(
    val type: String?,
    val handoff: VoxoHandoff?,
    val message: JsonObject?,
) {
    val isSync: Boolean get() = type == "conversation.sync"

    val isAgentMessage: Boolean get() = type == "message" && message?.string("role") == "agent"

    companion object {
        fun fromJson(json: JsonObject) = VoxoSocketEvent(
            type = json.string("type"),
            handoff = json["handoff"].asObject()?.let(VoxoHandoff::fromJson),
            message = json["message"].asObject(),
        )
    }
}

/**
 * Flux temps réel d'une conversation. **Strictement descendant** : rien n'est
 * jamais émis vers le serveur, l'envoi passe par REST.
 *
 * Toute terminaison (propre ou non) mène à une reconnexion en backoff
 * exponentiel : un refus d'autorisation détruit la connexion sans message.
 * Une reconnexion programmée est abandonnée si le `sessionId` a changé.
 */
internal class VoxoSocket(
    private val config: VoxoConfig,
    private val scope: CoroutineScope,
    private val client: OkHttpClient = OkHttpClient(),
) {
    private val mutableEvents = MutableSharedFlow<VoxoSocketEvent>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<VoxoSocketEvent> = mutableEvents

    private var socket: WebSocket? = null
    private var reconnectJob: Job? = null
    private var sessionId: String? = null
    private var attempt = 0
    private var disposed = false

    fun connect(sessionId: String) {
        if (disposed) return
        if (this.sessionId == sessionId && socket != null) return
        this.sessionId = sessionId
        attempt = 0
        open()
    }

    private fun open() {
        reconnectJob?.cancel()
        closeSocket()
        val target = sessionId?.takeIf { !disposed } ?: return
        val request = Request.Builder().url(config.conversationSocketUrl(target)).build()
        socket = client.newWebSocket(request, listener(target))
    }

    private fun listener(target: String) = object : WebSocketListener() {
        override fun onMessage(webSocket: WebSocket, text: String) {
            scope.launch { emit(text, target) }
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            scope.launch { scheduleReconnect(webSocket, target) }
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            scope.launch { scheduleReconnect(webSocket, target) }
        }
    }

    private fun emit(payload: String, target: String) {
        if (target != sessionId) return
        attempt = 0
        val decoded = runCatching { Json.parseToJsonElement(payload) }.getOrNull().asObject() ?: return
        mutableEvents.tryEmit(VoxoSocketEvent.fromJson(decoded))
    }

    private fun scheduleReconnect(origin: WebSocket, target: String) {
        // Un ancien socket qui se ferme ne doit pas relancer le courant.
        if (origin !== socket || disposed || target != sessionId) return
        closeSocket()
        val wait = VoxoLimits.reconnectDelay(attempt++)
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(wait)
            if (target == sessionId) open()
        }
    }

    private fun closeSocket() {
        socket?.cancel()
        socket = null
    }

    /**
     * Seule trame montante du socket : l'aperçu de saisie (voir CONTRACT.md). `false` si le socket n'est pas
     * ouvert — le texte est alors simplement perdu, il ne sera pas rejoué.
     */
    fun sendTyping(text: String): Boolean {
        val current = socket ?: return false
        return current.send(buildJsonObject { put("type", JsonPrimitive("typing")); put("text", JsonPrimitive(text)) }.toString())
    }

    fun disconnect() {
        reconnectJob?.cancel()
        sessionId = null
        closeSocket()
    }

    fun dispose() {
        disposed = true
        disconnect()
    }
}
