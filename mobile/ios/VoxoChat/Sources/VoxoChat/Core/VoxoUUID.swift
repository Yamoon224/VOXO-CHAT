import Foundation

/// Génération et validation d'UUID v4. Le backend **rejette** tout `clientMessageId`
/// qui n'est pas un UUID v4 strict : c'est ce champ qui porte l'idempotence.
public enum VoxoUUID {
    private static let pattern = try! NSRegularExpression(
        pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        options: [.caseInsensitive]
    )

    /// `UUID()` de Foundation produit déjà un v4 (bits de version et de variante posés).
    public static func v4() -> String { UUID().uuidString.lowercased() }

    public static func isValid(_ value: String?) -> Bool {
        guard let value else { return false }
        let range = NSRange(value.startIndex..., in: value)
        return pattern.firstMatch(in: value, options: [], range: range) != nil
    }
}
