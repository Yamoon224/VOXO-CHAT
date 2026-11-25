import Foundation

/// Identité de l'utilisateur, quand l'application hôte la connaît déjà. Fournie, elle
/// évite le formulaire de pré-chat.
public struct VoxoUser: Equatable {
    public var name: String?
    public var email: String?
    /// Identifiant stable côté app hôte. À défaut, le SDK en génère et persiste un anonyme.
    public var externalId: String?

    public init(name: String? = nil, email: String? = nil, externalId: String? = nil) {
        self.name = name
        self.email = email
        self.externalId = externalId
    }

    public var isEmpty: Bool { name == nil && email == nil && externalId == nil }
}

/// Réglages locaux. Apparence et fonctionnalités viennent de `GET /widget/config`.
public struct VoxoOptions {
    public var enableTyping: Bool
    /// Relances puis clôture automatique après 10 minutes de silence.
    public var enableInactivityMonitor: Bool
    public var persistSession: Bool
    /// Journalise les échanges réseau. À laisser à `false` en production.
    public var debug: Bool
    public var showLanguageSwitcher: Bool
    /// Aperçu de saisie vers le conseiller. N'a d'effet que si le propriétaire l'a activé ET pendant une prise
    /// en charge humaine : le texte en cours de frappe quitte alors l'appareil (voir CONTRACT.md).
    public var enableLiveTyping: Bool

    public init(
        enableTyping: Bool = true,
        enableInactivityMonitor: Bool = true,
        persistSession: Bool = true,
        debug: Bool = false,
        showLanguageSwitcher: Bool = true,
        enableLiveTyping: Bool = true
    ) {
        self.enableTyping = enableTyping
        self.enableInactivityMonitor = enableInactivityMonitor
        self.persistSession = persistSession
        self.debug = debug
        self.showLanguageSwitcher = showLanguageSwitcher
        self.enableLiveTyping = enableLiveTyping
    }
}

/// Configuration d'initialisation. `apiUrl` et `tenantId` sont fournis par l'intégrateur ;
/// le `tenantId` n'est pas un secret, et aucun autre secret ne doit transiter par une
/// application cliente.
public final class VoxoConfig {
    /// Racine de l'API, terminée par `/api`, sans barre oblique finale.
    public let apiUrl: String
    /// UUID v4 du tenant. Envoyé en header `X-Tenant-ID` sur chaque requête REST.
    public let tenantId: String
    public let user: VoxoUser?
    public let options: VoxoOptions
    /// `fr` ou `en` uniquement ; `fr` par défaut (pas de détection de la langue de l'appareil).
    public var locale: String
    /// Identifiant de l'application hôte, envoyé en `X-App-Id` (REST) et `appId` (WebSocket) pour le contrôle des
    /// applications autorisées. `VoxoController` le renseigne avec le *bundle identifier* s'il est absent.
    /// Déclaratif : ce n'est pas une authentification (voir CONTRACT.md).
    public var appId: String?

    /// Lève une `VoxoException` (`INVALID_CONFIG`, message en français) si l'URL ou le tenant sont invalides.
    public init(
        apiUrl: String,
        tenantId: String,
        user: VoxoUser? = nil,
        options: VoxoOptions = VoxoOptions(),
        locale: String? = nil,
        appId: String? = nil
    ) throws {
        let normalizedLocale = VoxoI18n.normalize(locale)
        self.apiUrl = try Self.normalizeApiUrl(apiUrl, normalizedLocale)
        guard VoxoUUID.isValid(tenantId) else {
            throw VoxoException(VoxoI18n.text(normalizedLocale, "invalidTenant"), code: "INVALID_CONFIG")
        }
        self.tenantId = tenantId
        self.user = user
        self.options = options
        self.locale = normalizedLocale
        let trimmedAppId = appId?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.appId = trimmedAppId?.isEmpty == false ? trimmedAppId : nil
    }

    /// URL du flux temps réel. L'autorisation passe par `tenantId` en query : le handshake
    /// WebSocket ne transporte pas de `X-Tenant-ID`. Le `sessionId` est encodé, jamais interprété.
    func conversationSocketURL(sessionId: String) -> URL? {
        guard var components = URLComponents(string: apiUrl) else { return nil }
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.percentEncodedPath += "/widget/conversation/\(Self.encodeSegment(sessionId))/socket"
        components.queryItems = [URLQueryItem(name: "tenantId", value: tenantId)]
            + (appId.map { [URLQueryItem(name: "appId", value: $0)] } ?? [])
        return components.url
    }

    func restURL(_ path: String, query: [String: String] = [:]) -> URL? {
        guard var components = URLComponents(string: apiUrl + path) else { return nil }
        if !query.isEmpty {
            components.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        return components.url
    }

    static func encodeSegment(_ value: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private static func normalizeApiUrl(_ value: String, _ locale: String) throws -> String {
        let invalid = VoxoException(VoxoI18n.text(locale, "invalidApiUrl"), code: "INVALID_CONFIG")
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let parsed = URLComponents(string: trimmed),
              let scheme = parsed.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = parsed.host, !host.isEmpty else { throw invalid }
        // Reconstruit sans query ni fragment collés par l'intégrateur.
        var rebuilt = URLComponents()
        rebuilt.scheme = scheme
        rebuilt.host = host
        rebuilt.port = parsed.port
        rebuilt.percentEncodedPath = parsed.percentEncodedPath.replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        guard let result = rebuilt.string else { throw invalid }
        return result
    }
}
