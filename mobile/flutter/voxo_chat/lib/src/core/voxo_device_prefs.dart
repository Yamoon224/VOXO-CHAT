import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'voxo_config.dart';
import 'voxo_push_platform.dart';

/// Préférences de l'appareil propres à un tenant : langue choisie et jeton de
/// notification. Ce store ne fait aucun appel réseau.
class VoxoDevicePrefs {
  VoxoDevicePrefs(this._config);

  final VoxoConfig _config;

  String get _localeKey => 'locale-${_config.tenantId}';
  String get _pushKey => 'push-token-${_config.tenantId}';

  Future<String?> loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_localeKey);
    return saved == 'fr' || saved == 'en' ? saved : null;
  }

  Future<void> saveLocale(String locale) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, locale);
  }

  Future<void> savePushToken(VoxoPushPlatform platform, String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _pushKey,
      jsonEncode({'platform': platform.wireName, 'token': token}),
    );
  }

  /// Jeton persisté, ou `null` s'il manque ou si la valeur est illisible.
  Future<({VoxoPushPlatform platform, String token})?> loadPushToken() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pushKey);
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw);
      if (json is! Map<String, dynamic>) return null;
      final platform = VoxoPushPlatform.fromWire(json['platform'] as String?);
      final token = json['token'];
      if (platform == null || token is! String || token.isEmpty) return null;
      return (platform: platform, token: token);
    } on FormatException {
      return null;
    }
  }

  Future<void> clearPushToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pushKey);
  }
}
