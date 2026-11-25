import 'dart:math';

/// Génération et validation d'UUID v4.
///
/// Le backend **rejette** tout `clientMessageId` qui n'est pas un UUID v4
/// strict (`validators/widgetMessageValidator.js`) : les bits de version et de
/// variante doivent être posés. C'est ce champ qui porte l'idempotence côté
/// serveur, d'où une implémentation locale plutôt qu'un identifiant approximatif.
abstract final class VoxoUuid {
  static final Random _random = Random.secure();

  /// Même forme que la regex du backend :
  /// `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`.
  static final RegExp pattern = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  static String v4() {
    final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
    final hex = bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
        '${hex.substring(20)}';
  }

  static bool isValid(String? value) =>
      value != null && pattern.hasMatch(value);
}
