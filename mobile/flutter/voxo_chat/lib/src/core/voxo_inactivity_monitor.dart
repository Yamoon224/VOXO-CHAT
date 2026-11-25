import 'dart:async';

import 'voxo_limits.dart';

/// Relances puis clôture automatique d'une conversation laissée en silence.
///
/// Reproduit le comportement du widget web : après 10 minutes sans activité, un
/// rappel est posté ; au troisième passage, un message de clôture est posté puis
/// la conversation est fermée via `POST /widget/conversation/:sessionId/timeout`.
///
/// Ce moniteur ne connaît ni le réseau ni l'UI : il appelle les rappels qu'on
/// lui fournit.
class VoxoInactivityMonitor {
  VoxoInactivityMonitor({
    required this.onReminder,
    required this.onClosing,
    required this.onTimeout,
    required this.isActive,
    this.delay = VoxoLimits.inactivityDelay,
    this.maxReminders = VoxoLimits.maxInactivityReminders,
    DateTime Function()? clock,
  }) : _now = clock ?? DateTime.now;

  /// Poste le message de relance dans le fil.
  final void Function() onReminder;

  /// Poste le message annonçant la clôture.
  final void Function() onClosing;

  /// Déclenche l'appel réseau de clôture.
  final Future<void> Function() onTimeout;

  /// La surveillance ne tourne que si la conversation est ouverte et vivante :
  /// pas de relance sur un chat fermé ou déjà terminé.
  final bool Function() isActive;

  final Duration delay;
  final int maxReminders;
  final DateTime Function() _now;

  Timer? _timer;
  DateTime _lastActivity = DateTime.now();
  int _reminderCount = 0;

  int get reminderCount => _reminderCount;

  void start({int reminderCount = 0}) {
    _reminderCount = reminderCount;
    touch();
    _timer?.cancel();
    _timer = Timer.periodic(VoxoLimits.inactivityTick, (_) => _tick());
  }

  /// À appeler à chaque signe de vie : saisie, envoi, ouverture du panneau.
  void touch() => _lastActivity = _now();

  /// Remet le compteur de relances à zéro sans toucher à l'horloge.
  void resetReminders() => _reminderCount = 0;

  Future<void> _tick() async {
    if (!isActive()) return;
    if (_now().difference(_lastActivity) <= delay) return;

    // Les premières échéances relancent l'utilisateur.
    if (_reminderCount < maxReminders - 1) {
      _reminderCount++;
      onReminder();
      touch();
      return;
    }

    // L'avant-dernière annonce la clôture, qui suit immédiatement.
    if (_reminderCount == maxReminders - 1) {
      _reminderCount++;
      onClosing();
      touch();
    }

    await onTimeout();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void dispose() => stop();
}
