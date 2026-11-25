import Foundation

/// Pièce jointe connue du serveur : fraîchement envoyée via `POST /widget/upload` ou lue
/// dans l'historique. `url` est **signée et à durée de vie limitée** : présente uniquement
/// sur les pièces lues dans l'historique, jamais persistée.
public struct VoxoAttachment: Equatable, Identifiable {
    public let id: String
    public let name: String
    public let category: VoxoAttachmentCategory?
    public let mimeType: String?
    public let size: Int64?
    public let url: String?

    public init(
        id: String,
        name: String,
        category: VoxoAttachmentCategory? = nil,
        mimeType: String? = nil,
        size: Int64? = nil,
        url: String? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.mimeType = mimeType
        self.size = size
        self.url = url
    }

    public var isImage: Bool { category == .image }

    func toJSON() -> JSONObject {
        var json: JSONObject = ["id": id, "name": name]
        if let category { json["category"] = category.rawValue }
        if let mimeType { json["mimeType"] = mimeType }
        if let size { json["size"] = size }
        return json
    }

    static func fromJSON(_ json: JSONObject) -> VoxoAttachment {
        VoxoAttachment(
            id: json.string("id") ?? "",
            name: json.string("name") ?? "Fichier",
            category: json.string("category").flatMap(VoxoAttachmentCategory.init(rawValue:)),
            mimeType: json.string("mimeType"),
            size: json.int64("size"),
            url: json.string("url")
        )
    }
}

/// Pièce jointe en préparation locale, avant d'être rattachée à un message. `remoteId` est
/// renseigné une fois l'upload réussi.
public struct VoxoPendingAttachment: Equatable, Identifiable {
    public let localId: String
    public let name: String
    public let size: Int64
    public let category: VoxoAttachmentCategory
    public let path: String
    public var remoteId: String?
    public var failed: Bool

    public var id: String { localId }
    public var isUploaded: Bool { remoteId != nil }
    public var isImage: Bool { category == .image }

    init(
        localId: String,
        name: String,
        size: Int64,
        category: VoxoAttachmentCategory,
        path: String,
        remoteId: String? = nil,
        failed: Bool = false
    ) {
        self.localId = localId
        self.name = name
        self.size = size
        self.category = category
        self.path = path
        self.remoteId = remoteId
        self.failed = failed
    }
}
