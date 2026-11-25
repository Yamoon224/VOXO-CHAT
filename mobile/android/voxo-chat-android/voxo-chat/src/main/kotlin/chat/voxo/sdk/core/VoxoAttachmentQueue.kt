package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoPendingAttachment
import chat.voxo.sdk.models.string
import java.io.File

/**
 * File des pièces jointes en préparation : compression, validation, upload
 * (`POST /widget/upload`). L'id serveur obtenu est celui qui part dans
 * `attachmentIds` du prochain message.
 */
class VoxoAttachmentQueue internal constructor(
    private val api: VoxoApiClient,
    private val config: VoxoConfig,
    private val compressor: VoxoImageCompressor,
    private val onChanged: () -> Unit,
    private val onError: (String) -> Unit,
) {
    var maxFiles: Int = VoxoFileRules.MAX_ATTACHMENTS_PER_MESSAGE
        private set
    var maxBytes: Long = VoxoFileRules.MAX_FILE_BYTES
        private set

    private val pending = mutableListOf<VoxoPendingAttachment>()

    val items: List<VoxoPendingAttachment> get() = pending.toList()
    val uploaded: List<VoxoPendingAttachment> get() = pending.filter { it.isUploaded }
    val uploadedIds: List<String> get() = uploaded.mapNotNull { it.remoteId }

    /** Au moins un fichier est encore en cours d'envoi. */
    val isUploading: Boolean get() = pending.any { !it.isUploaded && !it.failed }
    val isEmpty: Boolean get() = pending.isEmpty()
    val remainingSlots: Int get() = maxFiles - pending.size

    /** Ajoute des fichiers locaux (chemins). Les erreurs sont signalées, jamais levées. */
    suspend fun addAll(paths: List<String>) {
        if (paths.isEmpty()) return
        val room = remainingSlots
        if (room <= 0) {
            onError(VoxoI18n.text(config.locale, "maxAttachmentsError", mapOf("count" to maxFiles)))
            return
        }
        if (paths.size > room) {
            onError(VoxoI18n.text(config.locale, "remainingSlotsError", mapOf("count" to room)))
        }
        paths.take(room).forEach { addOne(it) }
    }

    private suspend fun addOne(path: String) {
        val prepared = compressor.compress(path)
        val file = File(prepared)
        val size = file.takeIf { it.isFile && it.canRead() }?.length()
        if (size == null) {
            onError(VoxoI18n.text(config.locale, "fileUnreadable"))
            return
        }

        val validation = VoxoFileRules.validate(file.name, size, maxBytes, config.locale)
        if (!validation.isValid) {
            onError(validation.error!!)
            return
        }

        val item = VoxoPendingAttachment(VoxoUuid.v4(), file.name, size, validation.category!!, prepared)
        pending.add(item)
        onChanged()
        upload(item, file)
    }

    private suspend fun upload(item: VoxoPendingAttachment, file: File) {
        try {
            val id = api.uploadAttachment(file, VoxoFileRules.mimeTypeOf(file.name)).string("id")
            if (id.isNullOrEmpty()) throw VoxoException.malformedResponse(config.locale)
            replace(item.copy(remoteId = id))
        } catch (error: VoxoException) {
            pending.removeAll { it.localId == item.localId }
            onChanged()
            onError(error.message)
        }
    }

    private fun replace(item: VoxoPendingAttachment) {
        val index = pending.indexOfFirst { it.localId == item.localId }
        if (index != -1) pending[index] = item
        onChanged()
    }

    fun remove(localId: String) {
        pending.removeAll { it.localId == localId }
        onChanged()
    }

    fun clear() {
        if (pending.isEmpty()) return
        pending.clear()
        onChanged()
    }

    /** Les limites annoncées par le serveur font foi sur les constantes locales. */
    internal fun applyServerLimits(maxFiles: Int, maxBytes: Long) {
        this.maxFiles = maxFiles
        this.maxBytes = maxBytes
    }
}
