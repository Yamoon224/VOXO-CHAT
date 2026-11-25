package chat.voxo.sdk.core

import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

/**
 * Fenêtre glissante côté client, miroir du rate limit serveur. Sert à éviter un
 * aller-retour perdu d'avance. Un `429` reste possible malgré une fenêtre locale
 * vide (le rate limit serveur est indexé sur l'IP) : condition transitoire.
 */
internal class VoxoRateLimiter(
    private val maxMessages: Int = VoxoLimits.MESSAGES_PER_MINUTE,
    private val window: Duration = VoxoLimits.rateLimitWindow,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val timestamps = ArrayDeque<Long>()

    /** Consomme un jeton. `false` si la fenêtre est pleine ; rien n'est alors consommé. */
    @Synchronized
    fun tryConsume(): Boolean {
        prune()
        if (timestamps.size >= maxMessages) return false
        timestamps.addLast(clock())
        return true
    }

    /** Délai avant qu'un jeton se libère ; zéro si un envoi est possible. */
    @Synchronized
    fun cooldown(): Duration {
        prune()
        if (timestamps.size < maxMessages) return Duration.ZERO
        val remaining = window.inWholeMilliseconds - (clock() - timestamps.first())
        return maxOf(0L, remaining).milliseconds
    }

    @Synchronized
    fun reset() = timestamps.clear()

    private fun prune() {
        val threshold = clock() - window.inWholeMilliseconds
        while (timestamps.isNotEmpty() && timestamps.first() <= threshold) timestamps.removeFirst()
    }
}
