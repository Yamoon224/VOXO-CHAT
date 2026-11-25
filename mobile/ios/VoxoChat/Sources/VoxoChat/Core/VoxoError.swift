import Foundation

/// Erreur remontée par le SDK. `message` est **toujours** destiné à l'utilisateur
/// final : quand l'erreur vient du serveur, c'est le champ `error` de l'enveloppe relayé
/// tel quel. Le SDK ne compose un message que pour ce que le serveur ne peut pas dire
/// (réseau, délai, validation locale).
public struct VoxoException: Error, LocalizedError, CustomStringConvertible {
    public let message: String
    /// Code métier du backend, ou code local (`NETWORK_UNAVAILABLE`, `TIMEOUT`, `INVALID_CONFIG`).
    public let code: String?
    /// Statut HTTP quand l'erreur vient d'une réponse.
    public let statusCode: Int?

    public init(_ message: String, code: String? = nil, statusCode: Int? = nil) {
        self.message = message
        self.code = code
        self.statusCode = statusCode
    }

    /// Condition transitoire : jamais de renvoi automatique en boucle.
    public var isRateLimited: Bool { code == "RATE_LIMIT_EXCEEDED" || statusCode == 429 }
    public var isQuotaExceeded: Bool { code == "QUOTA_EXCEEDED" }
    /// Sur `GET /widget/conversation/:sessionId` : cas normal d'une session neuve.
    public var isNotFound: Bool { statusCode == 404 }
    public var isTransport: Bool { code == "NETWORK_UNAVAILABLE" || code == "TIMEOUT" }

    public var errorDescription: String? { message }
    public var description: String { "VoxoException(\(code ?? "-")): \(message)" }

    static func network(_ locale: String = "fr") -> VoxoException {
        VoxoException(VoxoI18n.text(locale, "network"), code: "NETWORK_UNAVAILABLE")
    }

    static func timeout(_ locale: String = "fr") -> VoxoException {
        VoxoException(VoxoI18n.text(locale, "timeout"), code: "TIMEOUT")
    }

    static func malformedResponse(_ locale: String = "fr") -> VoxoException {
        VoxoException(VoxoI18n.text(locale, "malformed"), code: "MALFORMED_RESPONSE")
    }
}
