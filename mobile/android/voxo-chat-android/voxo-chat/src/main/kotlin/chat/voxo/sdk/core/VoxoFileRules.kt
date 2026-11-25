package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoAttachmentCategory
import java.util.Locale

/** Résultat de la validation locale d'un fichier. */
class VoxoFileValidation private constructor(
    val category: VoxoAttachmentCategory?,
    val error: String?,
) {
    val isValid: Boolean get() = error == null

    internal companion object {
        fun valid(category: VoxoAttachmentCategory) = VoxoFileValidation(category, null)
        fun invalid(error: String) = VoxoFileValidation(null, error)
    }
}

/**
 * MIROIR de `shared/file-rules.mjs` (lui-même miroir de
 * `backend/src/config/fileUploads.js`). Tout changement se reporte des deux côtés.
 */
object VoxoFileRules {
    const val MAX_FILE_BYTES: Long = 10L * 1024 * 1024
    const val MAX_ATTACHMENTS_PER_MESSAGE = 3

    val documentExtensions: Map<String, String> = linkedMapOf(
        ".pdf" to "application/pdf",
        ".doc" to "application/msword",
        ".docx" to "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx" to "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt" to "text/plain",
        ".md" to "text/markdown",
    )

    val imageExtensions: Map<String, String> = linkedMapOf(
        ".jpg" to "image/jpeg",
        ".jpeg" to "image/jpeg",
        ".png" to "image/png",
        ".webp" to "image/webp",
        ".gif" to "image/gif",
        ".bmp" to "image/bmp",
        ".tif" to "image/tiff",
        ".tiff" to "image/tiff",
    )

    val conversationExtensions: Map<String, String> = documentExtensions + imageExtensions

    /** Types MIME à passer au sélecteur de fichiers Android. */
    val allowedMimeTypes: List<String> get() = conversationExtensions.values.distinct()

    fun extensionOf(filename: String): String =
        Regex("\\.[^.]+$").find(filename.lowercase())?.value ?: ""

    fun categoryOf(filename: String): VoxoAttachmentCategory? {
        val extension = extensionOf(filename)
        return when {
            imageExtensions.containsKey(extension) -> VoxoAttachmentCategory.IMAGE
            documentExtensions.containsKey(extension) -> VoxoAttachmentCategory.DOCUMENT
            else -> null
        }
    }

    fun mimeTypeOf(filename: String): String? = conversationExtensions[extensionOf(filename)]

    fun formatSize(bytes: Long, locale: String = "fr"): String {
        val english = VoxoI18n.normalize(locale) == "en"
        if (bytes >= 1024 * 1024) {
            val megabytes = String.format(Locale.ROOT, "%.1f", bytes / (1024.0 * 1024.0))
            return if (english) "$megabytes MB" else "${megabytes.replace('.', ',')} Mo"
        }
        val kilobytes = maxOf(1L, Math.round(bytes / 1024.0))
        return "$kilobytes ${if (english) "KB" else "Ko"}"
    }

    fun validate(
        filename: String,
        sizeBytes: Long,
        maxBytes: Long = MAX_FILE_BYTES,
        locale: String = "fr",
    ): VoxoFileValidation {
        if (sizeBytes <= 0) return VoxoFileValidation.invalid(VoxoI18n.text(locale, "fileEmpty"))

        val category = categoryOf(filename)
            ?: return VoxoFileValidation.invalid(
                VoxoI18n.text(locale, "unsupportedFormat", mapOf("list" to conversationExtensions.keys.joinToString(", "))),
            )

        if (sizeBytes > maxBytes) {
            return VoxoFileValidation.invalid(
                VoxoI18n.text(
                    locale, "fileTooLarge",
                    mapOf("size" to formatSize(sizeBytes, locale), "max" to formatSize(maxBytes, locale)),
                ),
            )
        }
        return VoxoFileValidation.valid(category)
    }
}
