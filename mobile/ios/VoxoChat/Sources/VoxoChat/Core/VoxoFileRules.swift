import Foundation

public enum VoxoAttachmentCategory: String {
    case image, document
}

/// Résultat de la validation locale d'un fichier.
public struct VoxoFileValidation {
    public let category: VoxoAttachmentCategory?
    public let error: String?
    public var isValid: Bool { error == nil }

    static func valid(_ category: VoxoAttachmentCategory) -> VoxoFileValidation { .init(category: category, error: nil) }
    static func invalid(_ error: String) -> VoxoFileValidation { .init(category: nil, error: error) }
}

/// MIROIR de `shared/file-rules.mjs` (lui-même miroir de `backend/src/config/fileUploads.js`).
/// Tout changement se reporte des deux côtés.
public enum VoxoFileRules {
    public static let maxFileBytes: Int64 = 10 * 1024 * 1024
    public static let maxAttachmentsPerMessage = 3

    /// Dans l'ordre de `shared/file-rules.mjs`.
    public static let documentExtensions: [(ext: String, mime: String)] = [
        (".pdf", "application/pdf"),
        (".doc", "application/msword"),
        (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        (".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        (".txt", "text/plain"),
        (".md", "text/markdown"),
    ]

    public static let imageExtensions: [(ext: String, mime: String)] = [
        (".jpg", "image/jpeg"),
        (".jpeg", "image/jpeg"),
        (".png", "image/png"),
        (".webp", "image/webp"),
        (".gif", "image/gif"),
        (".bmp", "image/bmp"),
        (".tif", "image/tiff"),
        (".tiff", "image/tiff"),
    ]

    public static var conversationExtensions: [(ext: String, mime: String)] { documentExtensions + imageExtensions }

    /// Extensions sans point, pour les sélecteurs de fichiers.
    public static var allowedExtensions: [String] { conversationExtensions.map { String($0.ext.dropFirst()) } }

    public static func extensionOf(_ filename: String) -> String {
        let lowered = filename.lowercased()
        guard let dot = lowered.lastIndex(of: "."), dot != lowered.startIndex else { return "" }
        let ext = String(lowered[dot...])
        return ext.count > 1 ? ext : ""
    }

    public static func categoryOf(_ filename: String) -> VoxoAttachmentCategory? {
        let ext = extensionOf(filename)
        if imageExtensions.contains(where: { $0.ext == ext }) { return .image }
        if documentExtensions.contains(where: { $0.ext == ext }) { return .document }
        return nil
    }

    public static func mimeTypeOf(_ filename: String) -> String? {
        let ext = extensionOf(filename)
        return conversationExtensions.first { $0.ext == ext }?.mime
    }

    /// Taille d'un fichier local, nil s'il est absent ou illisible.
    static func fileSize(atPath path: String) -> Int64? {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: path),
              let size = attributes[.size] as? NSNumber else { return nil }
        return size.int64Value
    }

    public static func formatSize(_ bytes: Int64, locale: String = "fr") -> String {
        let english = VoxoI18n.normalize(locale) == "en"
        if bytes >= 1024 * 1024 {
            let megabytes = String(format: "%.1f", Double(bytes) / (1024.0 * 1024.0))
            return english ? "\(megabytes) MB" : "\(megabytes.replacingOccurrences(of: ".", with: ",")) Mo"
        }
        let kilobytes = max(1, Int((Double(bytes) / 1024.0).rounded()))
        return "\(kilobytes) \(english ? "KB" : "Ko")"
    }

    public static func validate(
        _ filename: String,
        sizeBytes: Int64,
        maxBytes: Int64 = maxFileBytes,
        locale: String = "fr"
    ) -> VoxoFileValidation {
        if sizeBytes <= 0 { return .invalid(VoxoI18n.text(locale, "fileEmpty")) }

        guard let category = categoryOf(filename) else {
            let list = conversationExtensions.map { $0.ext }.joined(separator: ", ")
            return .invalid(VoxoI18n.text(locale, "unsupportedFormat", ["list": list]))
        }

        if sizeBytes > maxBytes {
            return .invalid(VoxoI18n.text(locale, "fileTooLarge", [
                "size": formatSize(sizeBytes, locale: locale),
                "max": formatSize(maxBytes, locale: locale),
            ]))
        }
        return .valid(category)
    }
}
