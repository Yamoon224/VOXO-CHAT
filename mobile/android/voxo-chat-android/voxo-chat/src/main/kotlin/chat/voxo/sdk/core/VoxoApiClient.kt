package chat.voxo.sdk.core

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.File
import java.io.IOException
import java.io.InterruptedIOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Client REST du widget : **seul** point de sortie réseau du SDK. Pose
 * `X-Tenant-ID` et `Accept-Language` sur chaque requête et ne pose jamais
 * `Content-Type` sur un multipart (OkHttp écrit le `boundary`).
 */
internal class VoxoApiClient(
    private val config: VoxoConfig,
    httpClient: OkHttpClient? = null,
) {
    private val http: OkHttpClient = httpClient ?: OkHttpClient()

    suspend fun sendMessage(
        message: String,
        sessionId: String,
        clientMessageId: String,
        userId: String,
        userName: String? = null,
        userEmail: String? = null,
        attachmentIds: List<String> = emptyList(),
        metadata: Map<String, String> = emptyMap(),
    ): JsonObject = send(
        post(
            config.restUrl("/widget/message"),
            buildJsonObject {
                put("message", JsonPrimitive(message))
                put("sessionId", JsonPrimitive(sessionId))
                put("clientMessageId", JsonPrimitive(clientMessageId))
                put("userId", JsonPrimitive(userId))
                userName?.let { put("userName", JsonPrimitive(it)) }
                userEmail?.let { put("userEmail", JsonPrimitive(it)) }
                if (attachmentIds.isNotEmpty()) {
                    put("attachmentIds", JsonArray(attachmentIds.map(::JsonPrimitive)))
                }
                put("metadata", JsonObject((metadata + ("locale" to config.locale)).mapValues { JsonPrimitive(it.value) }))
            },
        ),
    )

    suspend fun uploadAttachment(file: File, mimeType: String?): JsonObject {
        val part = file.asRequestBody(mimeType?.toMediaType())
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", file.name, part)
            .build()
        return send(request(config.restUrl("/widget/upload")).post(body).build(), VoxoLimits.uploadTimeout.inWholeMilliseconds)
    }

    suspend fun getConversation(sessionId: String, limit: Int = 50, offset: Int = 0): JsonObject =
        send(
            get(
                conversationUrl(sessionId)
                    .addQueryParameter("limit", "$limit")
                    .addQueryParameter("offset", "$offset")
                    .build(),
            ),
        )

    suspend fun endConversation(
        sessionId: String,
        rating: Int? = null,
        feedback: String? = null,
        sessionDurationMs: Long? = null,
        messageCount: Int? = null,
    ): JsonObject = postConversation(
        sessionId, "end",
        buildJsonObject {
            rating?.let { put("rating", JsonPrimitive(it)) }
            if (!feedback.isNullOrEmpty()) put("feedback", JsonPrimitive(feedback))
            put("sessionDuration", sessionDurationMs.json())
            put("messageCount", messageCount.json())
        },
    )

    suspend fun endConversationForInactivity(
        sessionId: String,
        sessionDurationMs: Long? = null,
        messageCount: Int? = null,
    ): JsonObject = postConversation(
        sessionId, "timeout",
        buildJsonObject {
            put("sessionDuration", sessionDurationMs.json())
            put("messageCount", messageCount.json())
        },
    )

    /** [value] vaut `up`, `down` ou null pour retirer l'avis. */
    suspend fun sendMessageFeedback(
        sessionId: String,
        messageId: String? = null,
        messageIndex: Int? = null,
        value: String? = null,
    ): JsonObject = postConversation(
        sessionId, "message-feedback",
        buildJsonObject {
            messageId?.let { put("messageId", JsonPrimitive(it)) }
            messageIndex?.let { put("messageIndex", JsonPrimitive(it)) }
            put("value", value?.let(::JsonPrimitive) ?: JsonNull)
        },
    )

    /** Lie le jeton de notification à la session courante (voir CONTRACT.md). */
    suspend fun registerPushToken(sessionId: String, token: String, platform: String, locale: String): JsonObject = send(
        post(
            config.restUrl("/widget/push-token"),
            buildJsonObject {
                put("sessionId", JsonPrimitive(sessionId))
                put("token", JsonPrimitive(token))
                put("platform", JsonPrimitive(platform))
                put("locale", JsonPrimitive(locale))
            },
        ),
    )

    suspend fun unregisterPushToken(token: String): JsonObject = send(
        request(config.restUrl("/widget/push-token"))
            .delete(buildJsonObject { put("token", JsonPrimitive(token)) }.toString().toRequestBody(JSON))
            .build(),
    )

    suspend fun getConfig(): JsonObject = send(get(config.restUrl("/widget/config")))

    suspend fun getQuickReplies(category: String = "greeting"): JsonObject =
        send(get(config.restUrl("/widget/quick-replies").newBuilder().addQueryParameter("category", category).build()))

    suspend fun isHealthy(): Boolean = try {
        val data = send(get(config.restUrl("/widget/health")), VoxoLimits.healthTimeout.inWholeMilliseconds)
        (data["status"] as? JsonPrimitive)?.content == "healthy"
    } catch (_: VoxoException) {
        false
    }

    private fun conversationUrl(sessionId: String): HttpUrl.Builder =
        config.restUrl("/widget/conversation").newBuilder().addPathSegment(sessionId)

    private suspend fun postConversation(sessionId: String, action: String, body: JsonObject): JsonObject =
        send(post(conversationUrl(sessionId).addPathSegment(action).build(), body))

    private fun request(url: HttpUrl): Request.Builder = Request.Builder()
        .url(url)
        .header("X-Tenant-ID", config.tenantId)
        .header("Accept-Language", config.locale)
        .apply { config.appId?.let { header("X-App-Id", it) } }

    private fun get(url: HttpUrl): Request = request(url).get().build()

    private fun post(url: HttpUrl, body: JsonObject): Request =
        request(url).post(body.toString().toRequestBody(JSON)).build()

    private suspend fun send(request: Request, timeoutMs: Long = VoxoLimits.requestTimeout.inWholeMilliseconds): JsonObject {
        val locale = config.locale
        val call = http.newBuilder().callTimeout(timeoutMs, TimeUnit.MILLISECONDS).build().newCall(request)
        try {
            call.await().use { response ->
                return VoxoEnvelope.unwrap(response.code, response.body?.string().orEmpty(), locale)
            }
        } catch (_: InterruptedIOException) {
            throw VoxoException.timeout(locale)
        } catch (_: IOException) {
            throw VoxoException.network(locale)
        }
    }

    private fun Long?.json(): JsonElement = this?.let(::JsonPrimitive) ?: JsonNull
    private fun Int?.json(): JsonElement = this?.let(::JsonPrimitive) ?: JsonNull

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
    }
}

private suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
    continuation.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) = continuation.resume(response)
        override fun onFailure(call: Call, e: IOException) {
            if (!continuation.isCancelled) continuation.resumeWithException(e)
        }
    })
}
