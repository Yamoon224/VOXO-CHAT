import 'dart:convert';

import '../voxo_i18n.dart';
import 'voxo_exception.dart';

/// Décodage de l'enveloppe uniforme du backend widget.
///
/// Succès : `{"success": true, "data": {...}, "message": "…"}`
/// Erreur  : `{"success": false, "error": "…", "code": "…"}`
///
/// C'est le **seul** point de parsing d'enveloppe du SDK : ni l'UI ni le
/// controller ne doivent réinterpréter un corps de réponse brut.
abstract final class VoxoEnvelope {
  /// Renvoie `data` ou lève une [VoxoException] portant le message français
  /// du serveur.
  ///
  /// Un corps illisible sur une réponse en échec ne masque pas l'échec : on
  /// retombe sur un message générique en conservant le statut HTTP.
  static Map<String, dynamic> unwrap(
    int statusCode,
    String body, [
    String locale = 'fr',
  ]) {
    final decoded = _decode(body);

    if (decoded == null) {
      if (statusCode >= 400) {
        throw VoxoException(
          _fallbackMessage(statusCode, locale),
          code: 'HTTP_$statusCode',
          statusCode: statusCode,
        );
      }
      throw VoxoException.malformedResponse(locale);
    }

    if (decoded['success'] == true) {
      final data = decoded['data'];
      return data is Map<String, dynamic> ? data : const <String, dynamic>{};
    }

    final error = decoded['error'];
    throw VoxoException(
      error is String && error.isNotEmpty
          ? error
          : _fallbackMessage(statusCode, locale),
      code: decoded['code'] as String?,
      statusCode: statusCode,
    );
  }

  static Map<String, dynamic>? _decode(String body) {
    if (body.isEmpty) return null;
    try {
      final decoded = jsonDecode(body);
      return decoded is Map<String, dynamic> ? decoded : null;
    } on FormatException {
      return null;
    }
  }

  /// Filet de sécurité : le backend renvoie normalement toujours un `error`
  /// déjà rédigé pour l'utilisateur, dans la locale de la requête (en-tête
  /// `Accept-Language`). On n'arrive ici que si un intermédiaire (proxy,
  /// passerelle) a répondu à sa place.
  static String _fallbackMessage(int statusCode, String locale) {
    if (statusCode == 429) return VoxoI18n.text(locale, 'rateLimited');
    if (statusCode == 404) return VoxoI18n.text(locale, 'notFound');
    if (statusCode >= 500) return VoxoI18n.text(locale, 'unavailable');
    return VoxoI18n.text(locale, 'genericError');
  }
}
