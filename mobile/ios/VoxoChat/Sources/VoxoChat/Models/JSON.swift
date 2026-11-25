import Foundation

// Lecture tolérante du JSON du backend : une clé absente ou d'un type inattendu donne
// nil, jamais un crash. Un SDK ne doit pas planter sur une charge légèrement différente
// de celle documentée dans mobile/CONTRACT.md.

typealias JSONObject = [String: Any]

extension Dictionary where Key == String, Value == Any {
    func string(_ key: String) -> String? { self[key] as? String }

    func bool(_ key: String) -> Bool? { self[key] as? Bool }

    func int(_ key: String) -> Int? { (self[key] as? NSNumber).map { $0.intValue } }

    func int64(_ key: String) -> Int64? { (self[key] as? NSNumber).map { $0.int64Value } }

    func object(_ key: String) -> JSONObject { self[key] as? JSONObject ?? [:] }

    func objects(_ key: String) -> [JSONObject] { (self[key] as? [Any])?.compactMap { $0 as? JSONObject } ?? [] }

    func strings(_ key: String) -> [String] { (self[key] as? [Any])?.compactMap { $0 as? String } ?? [] }
}

func decodeJSONObject(_ text: String?) -> JSONObject? {
    guard let text, let data = text.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? JSONObject
}

func encodeJSON(_ object: Any) -> String {
    guard JSONSerialization.isValidJSONObject(object),
          let data = try? JSONSerialization.data(withJSONObject: object),
          let text = String(data: data, encoding: .utf8) else { return "{}" }
    return text
}

enum VoxoDates {
    private static let plain: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    /// Accepte les horodatages avec ou sans fraction de seconde.
    static func parse(_ value: String?) -> Date? {
        guard let value else { return nil }
        return fractional.date(from: value) ?? plain.date(from: value)
    }

    static func format(_ date: Date) -> String { fractional.string(from: date) }
}
