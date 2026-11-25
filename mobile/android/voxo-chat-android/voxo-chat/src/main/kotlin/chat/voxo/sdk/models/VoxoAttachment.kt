package chat.voxo.sdk.models

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/** Nature d'une pièce jointe, telle que le backend la classe. */
enum class VoxoAttachmentCategory {
    IMAGE, DOCUMENT;

    internal val wireName: String get() = name.lowercase()

    internal companion object {
        fun fromWire(value: String?): VoxoAttachmentCategory? =
            entries.firstOrNull { it.wireName == value }
    }
}

/**
 * Pièce jointe connue du serveur : fraîchement envoyée via `POST /widget/upload`
 * ou lue dans l'historique.
 *
 * [url] est **signée et à durée de vie limitée** : présente uniquement sur les
 * pièces lues dans l'historique, jamais persistée.
 */
data class VoxoAttachment(
    val id: String,
    val name: String,
    val category: VoxoAttachmentCategory? = null,
    val mimeType: String? = null,
    val size: Long? = null,
    val url: String? = null,
) {
    val isImage: Boolean get() = category == VoxoAttachmentCategory.IMAGE

    internal fun toJson(): JsonObject = buildJsonObject {
        put("id", JsonPrimitive(id))
        put("name", JsonPrimitive(name))
        category?.let { put("category", JsonPrimitive(it.wireName)) }
        mimeType?.let { put("mimeType", JsonPrimitive(it)) }
        size?.let { put("size", JsonPrimitive(it)) }
    }

    internal companion object {
        fun fromJson(json: JsonObject) = VoxoAttachment(
            id = json.string("id") ?: "",
            name = json.string("name") ?: "Fichier",
            category = VoxoAttachmentCategory.fromWire(json.string("category")),
            mimeType = json.string("mimeType"),
            size = json.long("size"),
            url = json.string("url"),
        )
    }
}

/**
 * Pièce jointe en préparation locale, avant d'être rattachée à un message.
 * [remoteId] est renseigné une fois l'upload réussi.
 */
data class VoxoPendingAttachment(
    val localId: String,
    val name: String,
    val size: Long,
    val category: VoxoAttachmentCategory,
    val path: String,
    val remoteId: String? = null,
    val failed: Boolean = false,
) {
    val isUploaded: Boolean get() = remoteId != null
    val isImage: Boolean get() = category == VoxoAttachmentCategory.IMAGE
}
