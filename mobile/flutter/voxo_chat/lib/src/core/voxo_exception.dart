import '../voxo_i18n.dart';

/// Erreur remontée par le SDK.
///
/// [message] est **toujours** destiné à l'utilisateur final, en français. Quand
/// l'erreur vient du serveur, c'est le champ `error` de l'enveloppe relayé tel
/// quel : le backend le rédige déjà pour l'utilisateur (voir
/// `mobile/CONTRACT.md`). Le SDK ne compose un message que pour ce que le
/// serveur ne peut pas dire — perte de réseau, délai dépassé, validation locale.
class VoxoException implements Exception {
  const VoxoException(this.message, {this.code, this.statusCode});

  /// Message en français, affichable tel quel.
  final String message;

  /// Code métier du backend (`RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, …) ou
  /// code local du SDK (`NETWORK_UNAVAILABLE`, `TIMEOUT`, `INVALID_CONFIG`).
  final String? code;

  /// Statut HTTP quand l'erreur vient d'une réponse. `null` sinon.
  final int? statusCode;

  /// Le serveur est injoignable : ni réponse, ni statut.
  factory VoxoException.network([String locale = 'fr']) => VoxoException(
        VoxoI18n.text(locale, 'network'),
        code: 'NETWORK_UNAVAILABLE',
      );

  /// Le délai d'attente local est dépassé avant toute réponse.
  factory VoxoException.timeout([String locale = 'fr']) => VoxoException(
        VoxoI18n.text(locale, 'timeout'),
        code: 'TIMEOUT',
      );

  /// La réponse n'est pas l'enveloppe attendue (proxy, page d'erreur HTML…).
  factory VoxoException.malformedResponse([String locale = 'fr']) => VoxoException(
        VoxoI18n.text(locale, 'malformed'),
        code: 'MALFORMED_RESPONSE',
      );

  /// Trop de messages envoyés : condition transitoire, jamais un renvoi
  /// automatique en boucle (le rate limit serveur est indexé sur l'IP, voir
  /// `mobile/CONTRACT.md`).
  bool get isRateLimited => code == 'RATE_LIMIT_EXCEEDED' || statusCode == 429;

  /// Le tenant a épuisé son quota : réessayer n'y changera rien.
  bool get isQuotaExceeded => code == 'QUOTA_EXCEEDED';

  /// Ressource absente. Sur `GET /widget/conversation/:sessionId`, c'est le cas
  /// normal d'une session neuve — à traiter comme « pas d'historique ».
  bool get isNotFound => statusCode == 404;

  /// Le réseau a fait défaut : un retour de connexion peut suffire à réussir.
  bool get isTransport =>
      code == 'NETWORK_UNAVAILABLE' || code == 'TIMEOUT';

  @override
  String toString() => 'VoxoException(${code ?? '-'}): $message';
}
