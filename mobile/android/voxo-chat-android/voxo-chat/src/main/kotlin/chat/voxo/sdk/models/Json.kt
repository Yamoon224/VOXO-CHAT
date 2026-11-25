package chat.voxo.sdk.models

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

// Lecture tolérante du JSON du backend : une clé absente ou d'un type inattendu
// donne null, jamais une exception. Un SDK ne doit pas planter sur une charge
// légèrement différente de celle documentée dans CONTRACT.md.

internal fun JsonElement?.asObject(): JsonObject? = this as? JsonObject

internal fun JsonElement?.asList(): List<JsonElement>? = (this as? JsonArray)?.toList()

private fun JsonElement?.primitive(): JsonPrimitive? =
    (this as? JsonPrimitive)?.takeIf { it !is JsonNull }

internal fun JsonObject.string(key: String): String? =
    this[key].primitive()?.takeIf { it.isString }?.content

internal fun JsonObject.bool(key: String): Boolean? = this[key].primitive()?.booleanOrNull

internal fun JsonObject.int(key: String): Int? = this[key].primitive()?.intOrNull

internal fun JsonObject.long(key: String): Long? = this[key].primitive()?.longOrNull

internal fun JsonObject.obj(key: String): JsonObject = this[key].asObject() ?: JsonObject(emptyMap())

internal fun JsonObject.objects(key: String): List<JsonObject> =
    this[key].asList()?.mapNotNull { it.asObject() } ?: emptyList()

internal fun JsonObject.strings(key: String): List<String> =
    this[key].asList()?.mapNotNull { it.primitive()?.takeIf { p -> p.isString }?.content } ?: emptyList()
