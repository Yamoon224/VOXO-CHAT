package chat.voxo.sdk.core

import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * Miroir client des limites du backend widget (voir `mobile/CONTRACT.md`). Ce ne
 * sont pas des inventions du SDK : toute révision se reporte dans CONTRACT.md et
 * dans les quatre SDK.
 */
object VoxoLimits {
    const val MAX_MESSAGE_LENGTH = 2000
    const val MAX_ATTACHMENTS_PER_MESSAGE = 3
    const val MAX_FEEDBACK_LENGTH = 1000
    const val MAX_FILE_BYTES: Long = 10L * 1024 * 1024
    const val MESSAGES_PER_MINUTE = 15
    val rateLimitWindow: Duration = 1.minutes

    val requestTimeout: Duration = 30.seconds
    val uploadTimeout: Duration = 2.minutes
    val healthTimeout: Duration = 10.seconds

    val inactivityDelay: Duration = 10.minutes
    const val MAX_INACTIVITY_REMINDERS = 3
    val inactivityTick: Duration = 1.minutes

    val sessionTimeout: Duration = 30.minutes

    const val MAX_MESSAGES_IN_MEMORY = 100
    const val MAX_PERSISTED_MESSAGES = 50

    val historyRetention: Duration = 30.days
    const val MAX_ARCHIVED_CONVERSATIONS = 30

    val socketReconnectBase: Duration = 1.seconds
    val socketReconnectMax: Duration = 15.seconds

    val healthCheckInterval: Duration = 55.seconds

    /** Délai de reconnexion du socket pour la [attempt]-ième tentative (0-indexée). */
    fun reconnectDelay(attempt: Int): Duration {
        val factor = 1L shl attempt.coerceIn(0, 20)
        val raw = socketReconnectBase.inWholeMilliseconds * factor
        return minOf(raw, socketReconnectMax.inWholeMilliseconds).milliseconds
    }
}
