package chat.voxo.sdk.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Aperçu de saisie : limite la cadence des trames `typing` (une toutes les 200 ms au plus, le serveur
 * ignore le reste) et garantit que la **dernière** valeur arrive, y compris la chaîne vide qui efface
 * l'aperçu chez le conseiller. N'envoie rien tant que [isEligible] est faux — fonction activée par le
 * propriétaire ET prise en charge humaine : c'est une donnée personnelle sensible.
 */
internal class VoxoTypingSender(
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
    private val isEligible: () -> Boolean,
    private val send: (String) -> Boolean,
    private val minIntervalMs: Long = MIN_INTERVAL_MS,
) {
    private var lastSentAt = Long.MIN_VALUE / 2
    private var lastText = ""
    private var latest = ""
    private var pending: Job? = null

    fun submit(text: String) {
        latest = text.take(MAX_TEXT_LENGTH)
        if (!isEligible() || latest == lastText) return
        val wait = minIntervalMs - (clock() - lastSentAt)
        if (wait <= 0) {
            flush()
        } else if (pending?.isActive != true) {
            pending = scope.launch {
                delay(wait)
                flush()
            }
        }
    }

    private fun flush() {
        pending = null
        if (!isEligible() || latest == lastText) return
        if (send(latest)) {
            lastText = latest
            lastSentAt = clock()
        }
    }

    internal companion object {
        const val MAX_TEXT_LENGTH = 500
        const val MIN_INTERVAL_MS = 200L
    }
}
