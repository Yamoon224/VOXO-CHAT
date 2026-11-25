import Foundation

/// Filtre des liens affichés dans les messages : seuls `http`, `https`, `mailto` et `tel`
/// s'ouvrent. Un chemin absolu (accepté par le widget web, relatif à son site) n'a aucune
/// cible dans une application : refusé.
enum VoxoSafeURL {
    private static let allowedSchemes: Set<String> = ["http", "https", "mailto", "tel"]
    private static let trailingPunctuation = try! NSRegularExpression(pattern: "[),.!?;:]+$")

    static func sanitize(_ value: String?) -> String? {
        guard let input = value?.trimmingCharacters(in: .whitespacesAndNewlines), !input.isEmpty,
              !input.hasPrefix("/"),
              !input.unicodeScalars.contains(where: { $0.value < 0x20 || $0.value == 0x7f }),
              let scheme = URLComponents(string: input)?.scheme?.lowercased() else { return nil }
        return allowedSchemes.contains(scheme) ? input : nil
    }

    /// Sépare la ponctuation finale d'une URL nue : elle n'en fait pas partie.
    static func splitTrailingPunctuation(_ value: String) -> (url: String, trailing: String) {
        let range = NSRange(value.startIndex..., in: value)
        guard let match = trailingPunctuation.firstMatch(in: value, range: range),
              let swiftRange = Range(match.range, in: value) else { return (value, "") }
        return (String(value[..<swiftRange.lowerBound]), String(value[swiftRange]))
    }
}
