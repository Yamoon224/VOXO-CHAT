import '../models/voxo_handoff.dart';
import 'voxo_api_client.dart';
import 'voxo_attachment_queue.dart';
import 'voxo_composer.dart';
import 'voxo_config.dart';
import 'voxo_conversation_state.dart';
import 'voxo_conversation_sync.dart';
import 'voxo_device_prefs.dart';
import 'voxo_feedback_service.dart';
import 'voxo_message_sender.dart';
import 'voxo_push_registrar.dart';
import 'voxo_rate_limiter.dart';
import 'voxo_realtime_binder.dart';
import 'voxo_session_store.dart';
import 'voxo_socket.dart';
import 'voxo_typing_sender.dart';

/// Racine de composition du controller.
///
/// Les collaborateurs forment un graphe fixe, et les assembler est une
/// responsabilité en soi : la rassembler ici garde le controller concentré sur
/// ce qu'il expose plutôt que sur la façon dont il est monté.
///
/// Les rappels viennent du controller — c'est lui qui sait notifier ses
/// auditeurs et remonter une erreur à l'utilisateur.
class VoxoControllerDeps {
  VoxoControllerDeps({
    required VoxoConfig config,
    required VoxoApiClient api,
    required VoxoConversationState state,
    required VoxoRateLimiter rateLimiter,
    required VoxoDevicePrefs prefs,
    required bool Function() isTypingEligible,
    required void Function() onChanged,
    required void Function(String message) onError,
    required void Function(VoxoHandoff handoff) onHandoff,
    required void Function(VoxoConnectivity connectivity) onConnectivity,
    required void Function(String text) onSystemMessage,
    required Future<void> Function(String previousSessionId) onSessionReplaced,
    required String Function() userId,
    required bool Function() isActive,
    required Future<void> Function() onPersist,
    required Future<void> Function() ensureOpenSession,
    VoxoSocket? socket,
  })  : sync = VoxoConversationSync(
          api: api,
          socket: socket ?? VoxoSocket(config),
          store: VoxoSessionStore(config),
          state: state,
          config: config,
        ),
        attachments = VoxoAttachmentQueue(
          api: api,
          config: config,
          onChanged: onChanged,
          onError: onError,
        ),
        sender = VoxoMessageSender(
          api: api,
          config: config,
          state: state,
          rateLimiter: rateLimiter,
          onChanged: onChanged,
          onError: onError,
          onSessionReplaced: onSessionReplaced,
          userId: userId,
        ),
        feedback = VoxoFeedbackService(
          api: api,
          config: config,
          state: state,
          onChanged: onChanged,
          onError: onError,
        ) {
    push = VoxoPushRegistrar(
      api: api,
      prefs: prefs,
      config: config,
      sessionId: () => state.sessionId,
    );
    // Hors option de l'application, l'aperçu exige l'accord du propriétaire et
    // la prise en charge par un conseiller (voir `CONTRACT.md`).
    typing = VoxoTypingSender(
      isEligible: () => config.options.enableLiveTyping && isTypingEligible(),
      send: sync.sendTyping,
    );
    realtime = VoxoRealtimeBinder(
      sync: sync,
      state: state,
      onChanged: onChanged,
      onError: onError,
      onHandoff: onHandoff,
      onConnectivity: onConnectivity,
      onSystemMessage: onSystemMessage,
      isActive: isActive,
    );
    composer = VoxoComposer(
      sender: sender,
      attachments: attachments,
      state: state,
      config: config,
      onChanged: onChanged,
      onError: onError,
      // Un envoi vaut signe de vie : la clôture automatique repart de zéro.
      onActivity: () => realtime
        ..touch()
        ..resetReminders(),
      onPersist: onPersist,
      ensureOpenSession: ensureOpenSession,
    );
  }

  /// Configuration distante, historique, persistance, socket, santé.
  final VoxoConversationSync sync;

  /// File des pièces jointes en attente. Exposée publiquement par le controller.
  final VoxoAttachmentQueue attachments;

  /// Envoi d'un message et réconciliation de la réponse.
  final VoxoMessageSender sender;

  /// Pouce haut/bas et notation de fin.
  final VoxoFeedbackService feedback;

  /// Lien entre le jeton de notification de l'appareil et la session courante.
  late final VoxoPushRegistrar push;

  /// Cadence et garde-fous de l'aperçu de saisie.
  late final VoxoTypingSender typing;

  /// Branche socket, inactivité et connectivité sur l'état. Construit dans le
  /// corps du constructeur : il dépend de [sync], monté juste avant.
  late final VoxoRealtimeBinder realtime;

  /// Mécanique de la zone de saisie. Dépend de [realtime] pour signaler
  /// l'activité, d'où sa construction après lui.
  late final VoxoComposer composer;
}
