package chat.voxo.sdk.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.time.Duration

/**
 * Relances puis clôture automatique après un silence prolongé : 10 min, 3
 * rappels (deux relances, une annonce de clôture) puis `/timeout`.
 */
internal class VoxoInactivityMonitor(
    private val scope: CoroutineScope,
    private val onReminder: () -> Unit,
    private val onClosing: () -> Unit,
    private val onTimeout: suspend () -> Unit,
    private val isActive: () -> Boolean,
    private val delay: Duration = VoxoLimits.inactivityDelay,
    private val maxReminders: Int = VoxoLimits.MAX_INACTIVITY_REMINDERS,
    private val tick: Duration = VoxoLimits.inactivityTick,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private var job: Job? = null
    private var lastActivity = clock()

    var reminderCount = 0
        private set

    fun start(reminderCount: Int = 0) {
        this.reminderCount = reminderCount
        touch()
        job?.cancel()
        job = scope.launch {
            while (true) {
                delay(tick)
                tick()
            }
        }
    }

    fun touch() {
        lastActivity = clock()
    }

    fun resetReminders() {
        reminderCount = 0
    }

    internal suspend fun tick() {
        if (!isActive()) return
        if (clock() - lastActivity <= delay.inWholeMilliseconds) return

        // Les premières échéances relancent l'utilisateur.
        if (reminderCount < maxReminders - 1) {
            reminderCount++
            onReminder()
            touch()
            return
        }
        // L'avant-dernière annonce la clôture, qui suit immédiatement.
        if (reminderCount == maxReminders - 1) {
            reminderCount++
            onClosing()
            touch()
        }
        onTimeout()
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
