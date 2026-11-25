import 'dart:async';

import '../models/voxo_handoff.dart';
import '../models/voxo_message.dart';
import 'voxo_conversation_state.dart';
import 'voxo_conversation_sync.dart';
import 'voxo_exception.dart';
import 'voxo_inactivity_monitor.dart';
import 'voxo_limits.dart';
import 'voxo_socket.dart';
import '../voxo_i18n.dart';

/// Branche les signaux extérieurs — flux temps réel, inactivité, santé du
/// service — sur l'état de la conversation.
///
/// Le controller expose une API publique ; ce binder traduit ce qui arrive tout
/// seul. Il ne décide de rien : il applique et prévient via ses rappels.
class VoxoRealtimeBinder {
  VoxoRealtimeBinder({
    required VoxoConversationSync sync,
    required VoxoConversationState state,
    required this.onChanged,
    required this.onError,
    required this.onHandoff,
    required this.onConnectivity,
    required this.onSystemMessage,
    required this.isActive,
  })  : _sync = sync,
        _state = state;

  final VoxoConversationSync _sync;
  final VoxoConversationState _state;

  final void Function() onChanged;
  final void Function(String message) onError;
  final void Function(VoxoHandoff handoff) onHandoff;
  final void Function(VoxoConnectivity connectivity) onConnectivity;

  /// Poste un message de l'assistant produit localement (relance d'inactivité).
  final void Function(String text) onSystemMessage;

  /// La surveillance d'inactivité ne tourne que sur une conversation ouverte et
  /// encore vivante.
  final bool Function() isActive;

  StreamSubscription<VoxoSocketEvent>? _subscription;
  VoxoInactivityMonitor? _inactivity;

  int get reminderCount => _inactivity?.reminderCount ?? 0;

  /// Branche le flux temps réel, et la surveillance d'inactivité si
  /// [enableInactivity] — l'application hôte peut préférer gérer elle-même le
  /// cycle de vie de la conversation.
  void start({int reminderCount = 0, bool enableInactivity = true}) {
    _subscription ??= _sync.events.listen(_onEvent);
    _sync.connectSocket();

    if (!enableInactivity) return;

    _inactivity ??= VoxoInactivityMonitor(
      onReminder: () =>
          onSystemMessage(VoxoTexts.inactivityReminder(_sync.config.locale)),
      onClosing: () =>
          onSystemMessage(VoxoTexts.inactivityClosing(_sync.config.locale)),
      onTimeout: _closeForInactivity,
      isActive: isActive,
    );
    _inactivity!.start(reminderCount: reminderCount);
  }

  void touch() => _inactivity?.touch();

  void resetReminders() => _inactivity?.resetReminders();

  /// Rebranche le flux sur une nouvelle session.
  void reconnect() {
    _sync.connectSocket();
    _inactivity?.resetReminders();
  }

  Future<void> _onEvent(VoxoSocketEvent event) async {
    if (event.handoff != null) onHandoff(event.handoff!);

    // Le serveur signale que le fil a bougé hors de notre vue : on le recharge
    // plutôt que de tenter une fusion partielle.
    if (event.isSync) {
      await refreshHistory();
      return;
    }

    if (!event.isAgentMessage) return;

    final message = VoxoMessage.fromHistory(event.message!);
    // Un même message peut arriver deux fois : reconnexion, resynchronisation.
    if (_state.hasServerId(message.serverId)) return;
    _state.add(message);
    onChanged();
  }

  /// Recharge l'historique depuis le serveur. Une session encore inconnue du
  /// serveur (404) laisse l'état intact, sans erreur affichée.
  Future<void> refreshHistory() async {
    try {
      final handoff = await _sync.syncHistory();
      if (handoff != null) onHandoff(handoff);
      onChanged();
    } on VoxoException catch (error) {
      onError(error.message);
    }
  }

  Future<void> _closeForInactivity() async {
    try {
      await _sync.endForInactivity();
      _state.sessionEnded = true;
      await _sync.archive(_state.sessionId, _state.messages);
      onChanged();
    } on VoxoException {
      onError(VoxoI18n.text(_sync.config.locale, 'autoCloseFailed'));
    }
  }

  /// Sonde la disponibilité du service, au plus une fois par minute sauf
  /// [force].
  Future<void> refreshConnectivity({bool force = false}) async {
    final result = await _sync.checkConnectivity(force: force);
    if (result != null) onConnectivity(result);
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _inactivity?.dispose();
    _sync.disposeSocket();
  }
}
