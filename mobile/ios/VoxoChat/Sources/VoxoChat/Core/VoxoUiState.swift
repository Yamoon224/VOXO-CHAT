import Foundation

/// Instantané immuable de tout ce qu'une interface a besoin d'afficher. Publié par
/// `VoxoController.state` ; l'UI fournie et une UI sur mesure le consomment à l'identique.
public struct VoxoUiState: Equatable {
    public var messages: [VoxoMessage] = []
    public var chatbot = VoxoChatbotConfig()
    public var connectivity: VoxoConnectivity = .connecting
    public var handoff = VoxoHandoff()
    public var pendingAttachments: [VoxoPendingAttachment] = []
    public var sessionId = ""
    public var locale = "fr"
    public var isReady = false
    /// Un envoi est en cours : affiche l'indicateur « en train d'écrire ».
    public var isLoading = false
    public var isUploading = false
    public var sessionEnded = false
    /// La conversation peut être notée (fonction active et au moins une réponse serveur).
    public var canRate = false
    /// Dernier message d'erreur destiné à l'utilisateur ; nil une fois acquitté.
    public var lastError: String?

    public init() {}
}
