import Foundation

/// État de la reprise de la conversation par un humain.
public enum VoxoHandoffStatus: String {
    case none, waiting, human

    static func fromApi(_ value: String?) -> VoxoHandoffStatus {
        switch value {
        case "waiting": return .waiting
        case "human": return .human
        default: return .none
        }
    }
}

/// Reprise humaine, telle qu'elle arrive par le WebSocket ou l'historique.
public struct VoxoHandoff: Equatable {
    public var status: VoxoHandoffStatus
    public var agentName: String?
    public var reason: String?

    public init(status: VoxoHandoffStatus = .none, agentName: String? = nil, reason: String? = nil) {
        self.status = status
        self.agentName = agentName
        self.reason = reason
    }

    public var isHandledByHuman: Bool { status == .human }

    /// Sous-titre localisé de l'en-tête ; nil quand l'assistant répond seul.
    public func label(for locale: String) -> String? {
        switch status {
        case .human:
            return VoxoI18n.text(locale, "handoffWithAgent", [
                "agent": agentName ?? VoxoI18n.text(locale, "handoffDefaultAgent"),
            ])
        case .waiting: return VoxoI18n.text(locale, "handoffWaiting")
        case .none: return nil
        }
    }

    static func fromJSON(_ json: JSONObject) -> VoxoHandoff {
        VoxoHandoff(
            status: VoxoHandoffStatus.fromApi(json.string("status") ?? json.string("handoffStatus")),
            agentName: json.object("assignedAgent").string("name"),
            reason: json.string("reason") ?? json.string("handoffReason")
        )
    }
}
