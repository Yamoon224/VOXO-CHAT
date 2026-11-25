import Foundation

/// Relie le jeton de notification de l'appareil à la session courante (voir CONTRACT.md,
/// `POST /widget/push-token`). Au mieux : une panne ou un refus ne remonte jamais à l'utilisateur, la session
/// suivante réessaie. `PUSH_NOT_ENABLED` (le propriétaire n'a rien configuré) coupe les tentatives jusqu'au
/// prochain jeton confié.
@MainActor
final class VoxoPushRegistrar {
    private let api: VoxoApiClient
    private let store: VoxoSessionStore
    private let config: VoxoConfig
    private let sessionId: () -> String

    private var token: (platform: VoxoPushPlatform, value: String)?
    private var disabledByOwner = false

    init(api: VoxoApiClient, store: VoxoSessionStore, config: VoxoConfig, sessionId: @escaping () -> String) {
        self.api = api
        self.store = store
        self.config = config
        self.sessionId = sessionId
    }

    func load() async {
        token = await store.loadPushToken().map { (platform: $0.0, value: $0.1) }
    }

    func register(_ value: String, platform: VoxoPushPlatform) async {
        token = (platform, value)
        await store.savePushToken(platform: platform, token: value)
        disabledByOwner = false
        await syncSession()
    }

    func unregister() async {
        guard let current = token else { return }
        token = nil
        await store.clearPushToken()
        _ = try? await api.unregisterPushToken(current.value)
    }

    /// À appeler après chaque changement de session : un jeton n'est lié qu'à une session à la fois.
    func syncSession() async {
        guard let current = token, !disabledByOwner else { return }
        do {
            _ = try await api.registerPushToken(
                sessionId: sessionId(), token: current.value, platform: current.platform.rawValue, locale: config.locale)
        } catch let error as VoxoException where error.code == "PUSH_NOT_ENABLED" {
            disabledByOwner = true
        } catch {
            // Panne réseau ou refus : on réessaiera à la prochaine session.
        }
    }
}
