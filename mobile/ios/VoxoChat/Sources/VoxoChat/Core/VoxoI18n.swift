import Foundation

/// Textes du SDK, en français (défaut) et en anglais.
public enum VoxoI18n {
    /// Ne retient que `fr` ou `en` ; toute autre valeur retombe sur `fr`.
    public static func normalize(_ locale: String?) -> String {
        locale?.lowercased() == "en" ? "en" : "fr"
    }

    public static func text(_ locale: String, _ key: String, _ values: [String: Any] = [:]) -> String {
        let catalog = normalize(locale) == "en" ? voxoCatalogEn : voxoCatalogFr
        var result = catalog[key] ?? voxoCatalogFr[key] ?? key
        for (name, value) in values {
            result = result.replacingOccurrences(of: "{\(name)}", with: "\(value)")
        }
        return result
    }

    static var catalogsHaveParity: Bool {
        Set(voxoCatalogFr.keys) == Set(voxoCatalogEn.keys)
    }
}
