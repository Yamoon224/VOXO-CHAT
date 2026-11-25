package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.VoxoMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Relie le socket, l'historique et l'inactivité à l'état de la conversation.
 * Reçoit les événements descendants ; n'envoie jamais rien sur le socket.
 */
internal class VoxoRealtimeBinder(
    private val scope: CoroutineScope,
    private val sync: VoxoConversationSync,
    private val state: VoxoConversationState,
    private val onChanged: () -> Unit,
    private val onError: (String) -> Unit,
    private val onHandoff: (VoxoHandoff) -> Unit,
    private val onConnectivity: (VoxoConnectivity) -> Unit,
    private val onSystemMessage: (String) -> Unit,
    private val isActive: () -> Boolean,
) {
    private var collector: Job? = null
    private var inactivity: VoxoInactivityMonitor? = null

    val reminderCount: Int get() = inactivity?.reminderCount ?: 0

    fun start(reminderCount: Int = 0, enableInactivity: Boolean = true) {
        if (collector == null) collector = scope.launch { sync.events.collect { onEvent(it) } }
        sync.connectSocket()
        if (!enableInactivity) return

        val locale = { sync.config.locale }
        val monitor = inactivity ?: VoxoInactivityMonitor(
            scope = scope,
            onReminder = { onSystemMessage(VoxoI18n.text(locale(), "inactivityReminder")) },
            onClosing = { onSystemMessage(VoxoI18n.text(locale(), "inactivityClosing")) },
            onTimeout = ::closeForInactivity,
            isActive = isActive,
        ).also { inactivity = it }
        monitor.start(reminderCount)
    }

    fun touch() = inactivity?.touch()

    fun resetReminders() = inactivity?.resetReminders()

    fun reconnect() {
        sync.connectSocket()
        inactivity?.resetReminders()
    }

    private suspend fun onEvent(event: VoxoSocketEvent) {
        event.handoff?.let(onHandoff)

        // Le fil a bougé hors de notre vue : on le recharge plutôt que de fusionner.
        if (event.isSync) {
            refreshHistory()
            return
        }
        if (!event.isAgentMessage) return

        val message = VoxoMessage.fromHistory(event.message!!)
        // Un même message peut arriver deux fois : reconnexion, resynchronisation.
        if (state.hasServerId(message.serverId)) return
        state.add(message)
        onChanged()
    }

    suspend fun refreshHistory() {
        try {
            sync.syncHistory()?.let(onHandoff)
            onChanged()
        } catch (error: VoxoException) {
            onError(error.message)
        }
    }

    private suspend fun closeForInactivity() {
        try {
            sync.endForInactivity()
            state.sessionEnded = true
            sync.archive(state.sessionId, state.messages.toList())
            onChanged()
        } catch (_: VoxoException) {
            onError(VoxoI18n.text(sync.config.locale, "autoCloseFailed"))
        }
    }

    suspend fun refreshConnectivity(force: Boolean = false) {
        sync.checkConnectivity(force)?.let(onConnectivity)
    }

    fun dispose() {
        collector?.cancel()
        collector = null
        inactivity?.stop()
        sync.disposeSocket()
    }
}
