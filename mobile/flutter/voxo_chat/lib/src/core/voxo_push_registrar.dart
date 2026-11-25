import 'voxo_api_client.dart';
import 'voxo_config.dart';
import 'voxo_device_prefs.dart';
import 'voxo_exception.dart';
import 'voxo_push_platform.dart';

/// Relie le jeton de notification de l'appareil à la session courante (voir
/// `CONTRACT.md`, `POST /widget/push-token`).
///
/// Au mieux : une panne ou un refus ne remonte jamais à l'utilisateur, la
/// session suivante réessaie. `PUSH_NOT_ENABLED` (le propriétaire n'a rien
/// configuré) coupe les tentatives jusqu'au prochain jeton confié.
class VoxoPushRegistrar {
  VoxoPushRegistrar({
    required VoxoApiClient api,
    required VoxoDevicePrefs prefs,
    required VoxoConfig config,
    required String Function() sessionId,
  }) : _api = api,
       _prefs = prefs,
       _config = config,
       _sessionId = sessionId;

  final VoxoApiClient _api;
  final VoxoDevicePrefs _prefs;
  final VoxoConfig _config;
  final String Function() _sessionId;

  ({VoxoPushPlatform platform, String token})? _token;
  bool _disabledByOwner = false;

  /// Recharge le jeton persisté lors d'un précédent lancement.
  Future<void> load() async => _token = await _prefs.loadPushToken();

  Future<void> register(String token, VoxoPushPlatform platform) async {
    _token = (platform: platform, token: token);
    await _prefs.savePushToken(platform, token);
    _disabledByOwner = false;
    await syncSession();
  }

  Future<void> unregister() async {
    final current = _token;
    if (current == null) return;
    _token = null;
    await _prefs.clearPushToken();
    try {
      await _api.unregisterPushToken(current.token);
    } catch (_) {
      // Au mieux : un jeton resté côté serveur expirera de lui-même.
    }
  }

  /// À appeler après chaque changement de session : un jeton n'est lié qu'à une
  /// session à la fois.
  Future<void> syncSession() async {
    final current = _token;
    if (current == null || _disabledByOwner) return;
    try {
      await _api.registerPushToken(
        sessionId: _sessionId(),
        token: current.token,
        platform: current.platform.wireName,
        locale: _config.locale,
      );
    } on VoxoException catch (error) {
      if (error.code == 'PUSH_NOT_ENABLED') _disabledByOwner = true;
    }
  }
}
