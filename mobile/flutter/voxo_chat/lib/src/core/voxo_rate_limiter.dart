import 'voxo_limits.dart';

/// Fenêtre glissante côté client, miroir du rate limit serveur.
///
/// Le but n'est pas de protéger le serveur — il se protège déjà — mais d'éviter
/// un aller-retour perdu d'avance et d'afficher un message utile avant l'envoi.
///
/// Rappel de `mobile/CONTRACT.md` : le rate limit serveur est indexé sur l'IP.
/// Derrière un NAT opérateur, un `429` peut donc survenir alors même que cette
/// fenêtre locale est loin d'être pleine. C'est une condition **transitoire**,
/// jamais un motif de renvoi automatique en boucle.
class VoxoRateLimiter {
  VoxoRateLimiter({
    this.maxMessages = VoxoLimits.messagesPerMinute,
    this.window = VoxoLimits.rateLimitWindow,
    DateTime Function()? clock,
  }) : _now = clock ?? DateTime.now;

  final int maxMessages;
  final Duration window;
  final DateTime Function() _now;
  final List<DateTime> _timestamps = [];

  /// Consomme un jeton. `false` si le quota de la fenêtre est atteint — dans ce
  /// cas rien n'est consommé, un nouvel essai plus tard reste possible.
  bool tryConsume() {
    _prune();
    if (_timestamps.length >= maxMessages) return false;
    _timestamps.add(_now());
    return true;
  }

  /// Délai avant qu'un jeton se libère. `Duration.zero` si un envoi est
  /// possible immédiatement.
  Duration get cooldown {
    _prune();
    if (_timestamps.length < maxMessages) return Duration.zero;
    final elapsed = _now().difference(_timestamps.first);
    final remaining = window - elapsed;
    return remaining.isNegative ? Duration.zero : remaining;
  }

  void reset() => _timestamps.clear();

  void _prune() {
    final threshold = _now().subtract(window);
    _timestamps.removeWhere((timestamp) => !timestamp.isAfter(threshold));
  }
}
