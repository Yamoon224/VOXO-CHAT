import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// Fonctions ajoutées en v1.1 (voir mobile/CONTRACT.md) : aperçu de saisie, notifications push, historique archivé.
@MainActor
extension VoxoController {
    /// À appeler à chaque modification du champ de saisie. Sans effet hors aperçu de saisie autorisé (voir CONTRACT.md).
    public func notifyTyping(_ text: String) { typing.submit(text) }

    /// Confie le jeton FCM/APNs obtenu par l'app hôte, lié à la session courante (sans effet si non activé côté propriétaire).
    public func registerPushToken(_ token: String, platform: VoxoPushPlatform) async {
        await push.register(token, platform: platform)
    }

    /// Oublie le jeton (déconnexion de l'utilisateur dans l'app hôte).
    public func unregisterPushToken() async { await push.unregister() }

    /// Relit une conversation archivée en lecture seule ; la session active n'est pas modifiée.
    public func archivedConversation(_ sessionId: String) async throws -> VoxoArchivedView {
        try await sync.loadArchived(sessionId: sessionId)
    }

    nonisolated static func defaultCompressor() -> VoxoImageCompressor {
        #if canImport(ImageIO) && canImport(CoreGraphics)
        return VoxoImageIOCompressor()
        #else
        return VoxoNoCompression()
        #endif
    }
}
