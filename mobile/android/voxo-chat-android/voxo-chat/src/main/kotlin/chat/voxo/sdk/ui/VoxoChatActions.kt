package chat.voxo.sdk.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.core.VoxoFileRules
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.ui.markdown.VoxoSafeUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/** Actions plateforme de l'UI fournie : sélecteur de fichiers et ouverture de liens. */
object VoxoChatActions {
    /**
     * Renvoie une fonction qui ouvre le sélecteur de documents Android. Les
     * fichiers choisis sont copiés dans le cache de l'app (un `content://` n'est
     * pas un chemin) puis confiés à la file de pièces jointes, qui valide.
     */
    @Composable
    fun rememberFilePicker(controller: VoxoController): () -> Unit {
        val context = LocalContext.current
        val scope = rememberCoroutineScope()
        val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
            if (uris.isEmpty()) return@rememberLauncherForActivityResult
            scope.launch {
                val paths = withContext(Dispatchers.IO) { uris.take(controller.attachments.remainingSlots).mapNotNull { copyToCache(context, it) } }
                controller.attachments.addAll(paths)
            }
        }
        return {
            if (controller.attachments.remainingSlots <= 0) {
                controller.reportError(
                    VoxoI18n.text(controller.config.locale, "maxAttachmentsError", mapOf("count" to controller.attachments.maxFiles)),
                )
            } else {
                runCatching { launcher.launch(VoxoFileRules.allowedMimeTypes.toTypedArray()) }
                    .onFailure { controller.reportError(VoxoI18n.text(controller.config.locale, "filePickerUnavailable")) }
            }
        }
    }

    /** N'ouvre qu'un lien passé par [VoxoSafeUrl] ; sinon signale l'erreur, sans planter. */
    fun openLink(context: Context, controller: VoxoController, url: String) {
        val safe = VoxoSafeUrl.sanitize(url)
        val failure = VoxoI18n.text(controller.config.locale, "linkOpenFailed")
        if (safe == null) return controller.reportError(failure)
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(safe)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            controller.reportError(failure)
        }
    }

    private fun copyToCache(context: Context, uri: Uri): String? = try {
        val name = displayName(context, uri) ?: "fichier"
        // Sous-dossier unique : deux fichiers de même nom ne s'écrasent pas, et le nom d'origine
        // (affiché et envoyé au serveur) reste intact. `File(name).name` écarte tout séparateur de chemin.
        val directory = File(context.cacheDir, "voxo-${System.nanoTime()}").apply { mkdirs() }
        val target = File(directory, File(name).name.ifBlank { "fichier" })
        context.contentResolver.openInputStream(uri)?.use { input -> target.outputStream().use { input.copyTo(it) } }
        target.takeIf { it.exists() }?.absolutePath
    } catch (_: Exception) {
        null
    }

    private fun displayName(context: Context, uri: Uri): String? =
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
        }
}
