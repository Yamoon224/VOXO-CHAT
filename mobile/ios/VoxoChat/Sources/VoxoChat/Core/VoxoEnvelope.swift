import Foundation

/// Décodage de l'enveloppe uniforme du backend widget. C'est le **seul** point de
/// parsing d'enveloppe du SDK : ni l'UI ni le controller ne réinterprètent un corps de
/// réponse brut.
enum VoxoEnvelope {
    /// Renvoie `data`, ou lève une `VoxoException` portant le message du serveur.
    static func unwrap(statusCode: Int, body: String, locale: String = "fr") throws -> JSONObject {
        guard let decoded = decodeJSONObject(body.isEmpty ? nil : body) else {
            if statusCode >= 400 {
                throw VoxoException(fallbackMessage(statusCode, locale), code: "HTTP_\(statusCode)", statusCode: statusCode)
            }
            throw VoxoException.malformedResponse(locale)
        }

        if decoded.bool("success") == true {
            return decoded.object("data")
        }

        let error = decoded.string("error")
        throw VoxoException(
            error.flatMap { $0.isEmpty ? nil : $0 } ?? fallbackMessage(statusCode, locale),
            code: decoded.string("code"),
            statusCode: statusCode
        )
    }

    /// Filet de sécurité : un intermédiaire (proxy, passerelle) a répondu à la place du backend.
    private static func fallbackMessage(_ statusCode: Int, _ locale: String) -> String {
        switch statusCode {
        case 429: return VoxoI18n.text(locale, "rateLimited")
        case 404: return VoxoI18n.text(locale, "notFound")
        case 500...: return VoxoI18n.text(locale, "unavailable")
        default: return VoxoI18n.text(locale, "genericError")
        }
    }
}
