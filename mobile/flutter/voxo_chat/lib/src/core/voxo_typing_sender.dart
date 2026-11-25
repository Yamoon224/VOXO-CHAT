import 'dart:async';

/// Aperçu de saisie : limite la cadence des trames `typing` (une toutes les
/// 200 ms au plus, le serveur ignore le reste) et garantit que la **dernière**
/// valeur arrive, y compris la chaîne vide qui efface l'aperçu chez le
/// conseiller.
///
/// N'envoie rien tant que `isEligible` est faux — fonction activée par le
/// propriétaire ET prise en charge humaine : c'est une donnée personnelle
/// sensible. Une trame que le socket n'a pas pu émettre n'est pas comptée comme
/// envoyée : elle repartira à la prochaine modification.
class VoxoTypingSender {
  VoxoTypingSender({
    required bool Function() isEligible,
    required bool Function(String text) send,
    int Function()? clock,
    Timer Function(Duration delay, void Function() callback)? schedule,
    int minIntervalMs = minIntervalMsDefault,
  }) : _isEligible = isEligible,
       _send = send,
       _clock = clock ?? (() => DateTime.now().millisecondsSinceEpoch),
       _schedule = schedule ?? Timer.new,
       _minIntervalMs = minIntervalMs;

  static const int maxTextLength = 500;
  static const int minIntervalMsDefault = 200;

  final bool Function() _isEligible;
  final bool Function(String text) _send;
  final int Function() _clock;
  final Timer Function(Duration delay, void Function() callback) _schedule;
  final int _minIntervalMs;

  int? _lastSentAt;
  String _lastText = '';
  String _latest = '';
  Timer? _pending;

  /// À appeler à chaque modification du champ de saisie.
  void submit(String text) {
    _latest = text.length > maxTextLength
        ? text.substring(0, maxTextLength)
        : text;
    if (!_isEligible() || _latest == _lastText) return;

    final lastSentAt = _lastSentAt;
    final wait = lastSentAt == null
        ? 0
        : _minIntervalMs - (_clock() - lastSentAt);
    if (wait <= 0) {
      _flush();
    } else {
      _pending ??= _schedule(Duration(milliseconds: wait), _flush);
    }
  }

  void _flush() {
    _pending = null;
    if (!_isEligible() || _latest == _lastText) return;
    if (_send(_latest)) {
      _lastText = _latest;
      _lastSentAt = _clock();
    }
  }

  void dispose() {
    _pending?.cancel();
    _pending = null;
  }
}
