package chat.voxo.sdk.core

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/**
 * Identité de l'utilisateur, quand l'application hôte la connaît déjà. Fournie,
 * elle évite le formulaire de pré-chat.
 */
data class VoxoUser(
    val name: String? = null,
    val email: String? = null,
    /** Identifiant stable côté app hôte. À défaut, le SDK en génère et persiste un anonyme. */
    val externalId: String? = null,
) {
    val isEmpty: Boolean get() = name == null && email == null && externalId == null
}

/** Réglages locaux. Apparence et fonctionnalités viennent de `GET /widget/config`. */
data class VoxoOptions(
    val enableTyping: Boolean = true,
    /** Relances puis clôture automatique après 10 minutes de silence. */
    val enableInactivityMonitor: Boolean = true,
    val persistSession: Boolean = true,
    /**
     * Aperçu de saisie vers le conseiller. N'a d'effet que si le propriétaire l'a activé ET pendant une
     * prise en charge humaine : le texte en cours de frappe quitte alors l'appareil (voir CONTRACT.md).
     */
    val enableLiveTyping: Boolean = true,
    /** Journalise les échanges réseau. À laisser à `false` en production. */
    val debug: Boolean = false,
    val showLanguageSwitcher: Boolean = true,
)

/**
 * Configuration d'initialisation. [apiUrl] et [tenantId] sont fournis par
 * l'intégrateur ; le `tenantId` n'est pas un secret, et aucun autre secret ne
 * doit transiter par une application cliente.
 */
class VoxoConfig(
    apiUrl: String,
    val tenantId: String,
    val user: VoxoUser? = null,
    val options: VoxoOptions = VoxoOptions(),
    locale: String? = null,
    appId: String? = null,
) {
    /** `fr` ou `en` uniquement ; `fr` par défaut (pas de détection de la langue de l'appareil). */
    @Volatile
    var locale: String = VoxoI18n.normalize(locale)

    /**
     * Identifiant de l'application hôte, envoyé en `X-App-Id` (REST) et `appId` (WebSocket) pour le contrôle
     * des applications autorisées. `VoxoController` le renseigne avec le *package name* s'il est absent.
     * Déclaratif : ce n'est pas une authentification (voir CONTRACT.md).
     */
    @Volatile
    var appId: String? = appId?.trim()?.takeIf { it.isNotEmpty() }

    /** Racine de l'API, terminée par `/api`, sans barre oblique finale. */
    val apiUrl: String = normalizeApiUrl(apiUrl, this.locale)

    init {
        if (!VoxoUuid.isValid(tenantId)) {
            throw VoxoException(VoxoI18n.text(this.locale, "invalidTenant"), code = "INVALID_CONFIG")
        }
    }

    /**
     * URL du flux temps réel. L'autorisation passe par `tenantId` en query : le
     * handshake WebSocket ne transporte pas de `X-Tenant-ID`. Les segments sont
     * ajoutés un à un pour que le `sessionId` soit encodé, pas interprété.
     */
    fun conversationSocketUrl(sessionId: String): String {
        val http: HttpUrl = apiUrl.toHttpUrlOrNull()!!
            .newBuilder()
            .addPathSegment("widget")
            .addPathSegment("conversation")
            .addPathSegment(sessionId)
            .addPathSegment("socket")
            .addQueryParameter("tenantId", tenantId)
            .apply { appId?.let { addQueryParameter("appId", it) } }
            .build()
        return http.toString().replaceFirst("http", "ws")
    }

    internal fun restUrl(path: String): HttpUrl = "$apiUrl$path".toHttpUrlOrNull()!!

    private companion object {
        fun normalizeApiUrl(value: String, locale: String): String {
            val url = value.trim().toHttpUrlOrNull()
                ?: throw VoxoException(VoxoI18n.text(locale, "invalidApiUrl"), code = "INVALID_CONFIG")
            // Reconstruit sans query ni fragment collés par l'intégrateur.
            val port = if (url.port == HttpUrl.defaultPort(url.scheme)) "" else ":${url.port}"
            return "${url.scheme}://${url.host}$port${url.encodedPath.trimEnd('/')}"
        }
    }
}
