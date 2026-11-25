import Foundation

/// Auteur d'un message. `internal_note` n'est jamais exposé au widget.
public enum VoxoRole: String {
    case user, assistant, agent

    static func fromApi(_ value: String?) -> VoxoRole {
        switch value {
        case "user": return .user
        case "agent": return .agent
        default: return .assistant
        }
    }
}

/// Progression de l'envoi d'un message utilisateur.
public enum VoxoDeliveryStatus: String {
    case sending, answered, failed
}

/// Avis exprimé sur une réponse.
public enum VoxoFeedback: String {
    case up, down
}

/// Un message du fil. `id` est l'identifiant **local** (UUID v4, aussi utilisé comme
/// `clientMessageId`) ; `serverId` n'existe qu'une fois le message accepté et reste le seul
/// utilisable pour le feedback. Valeur immuable : l'état exposé ne contient que des copies.
public struct VoxoMessage: Equatable, Identifiable {
    public let id: String
    public var serverId: String?
    public let role: VoxoRole
    public let text: String
    public let timestamp: Date
    public let suggestions: [String]
    public var attachments: [VoxoAttachment]
    public var deliveryStatus: VoxoDeliveryStatus?
    public var feedback: VoxoFeedback?
    public var messageIndex: Int?
    /// Accueil produit localement : jamais envoyé au serveur.
    public let isWelcome: Bool
    /// Identifiants serveur des pièces déjà envoyées, pour réessayer sans re-téléverser.
    public let pendingAttachmentIds: [String]

    public init(
        id: String = VoxoUUID.v4(),
        serverId: String? = nil,
        role: VoxoRole,
        text: String,
        timestamp: Date = Date(),
        suggestions: [String] = [],
        attachments: [VoxoAttachment] = [],
        deliveryStatus: VoxoDeliveryStatus? = nil,
        feedback: VoxoFeedback? = nil,
        messageIndex: Int? = nil,
        isWelcome: Bool = false,
        pendingAttachmentIds: [String] = []
    ) {
        self.id = id
        self.serverId = serverId
        self.role = role
        self.text = text
        self.timestamp = timestamp
        self.suggestions = suggestions
        self.attachments = attachments
        self.deliveryStatus = deliveryStatus
        self.feedback = feedback
        self.messageIndex = messageIndex
        self.isWelcome = isWelcome
        self.pendingAttachmentIds = pendingAttachmentIds
    }

    public var isFromUser: Bool { role == .user }
    public var hasFailed: Bool { deliveryStatus == .failed }
    public var canReceiveFeedback: Bool { role != .user && (serverId != nil || messageIndex != nil) }

    func toJSON() -> JSONObject {
        var json: JSONObject = [
            "id": id,
            "role": role.rawValue,
            "text": text,
            "timestamp": VoxoDates.format(timestamp),
            "suggestions": suggestions,
            "attachments": attachments.map { $0.toJSON() },
            "isWelcome": isWelcome,
            "pendingAttachmentIds": pendingAttachmentIds,
        ]
        if let serverId { json["serverId"] = serverId }
        if let deliveryStatus { json["deliveryStatus"] = deliveryStatus.rawValue }
        if let feedback { json["feedback"] = feedback.rawValue }
        if let messageIndex { json["messageIndex"] = messageIndex }
        return json
    }

    /// Message tel que le renvoie `GET /widget/conversation/:sessionId` ou le socket.
    static func fromHistory(_ json: JSONObject) -> VoxoMessage {
        let role = VoxoRole.fromApi(json.string("role"))
        return VoxoMessage(
            id: json.string("id") ?? VoxoUUID.v4(),
            serverId: json.string("id"),
            role: role,
            text: json.string("content") ?? "",
            timestamp: VoxoDates.parse(json.string("timestamp")) ?? Date(),
            attachments: json.objects("attachments").map(VoxoAttachment.fromJSON),
            deliveryStatus: role == .user ? .answered : nil,
            feedback: json.string("feedback").flatMap(VoxoFeedback.init(rawValue:)),
            messageIndex: json.int("messageIndex")
        )
    }

    static func fromJSON(_ json: JSONObject) -> VoxoMessage {
        VoxoMessage(
            id: json.string("id") ?? VoxoUUID.v4(),
            serverId: json.string("serverId"),
            role: VoxoRole.fromApi(json.string("role")),
            text: json.string("text") ?? "",
            timestamp: VoxoDates.parse(json.string("timestamp")) ?? Date(),
            suggestions: json.strings("suggestions"),
            attachments: json.objects("attachments").map(VoxoAttachment.fromJSON),
            deliveryStatus: json.string("deliveryStatus").flatMap(VoxoDeliveryStatus.init(rawValue:)),
            feedback: json.string("feedback").flatMap(VoxoFeedback.init(rawValue:)),
            messageIndex: json.int("messageIndex"),
            isWelcome: json.bool("isWelcome") ?? false,
            pendingAttachmentIds: json.strings("pendingAttachmentIds")
        )
    }
}
