import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/voxo_chatbot_config.dart';
import '../models/voxo_handoff.dart';
import '../models/voxo_message.dart';
import 'voxo_api_client.dart';
import 'voxo_archived_view.dart';
import 'voxo_attachment_queue.dart';
import 'voxo_composer.dart';
import 'voxo_config.dart';
import 'voxo_controller_deps.dart';
import 'voxo_push_registrar.dart';
import 'voxo_typing_sender.dart';
import 'voxo_conversation_state.dart';
import 'voxo_conversation_sync.dart';
import 'voxo_device_prefs.dart';
import 'voxo_feedback_service.dart';
import 'voxo_push_platform.dart';
import 'voxo_rate_limiter.dart';
import 'voxo_realtime_binder.dart';
import 'voxo_session_store.dart';
import 'voxo_socket.dart';

/// Cerveau du SDK : état observable de la conversation et actions publiques.
///
/// C'est le point d'entrée pour une UI maison — l'écran fourni par le SDK n'est
/// qu'un consommateur parmi d'autres. Le controller ne construit aucun widget.
class VoxoController extends ChangeNotifier {
  VoxoController({
    required this.config,
    VoxoApiClient? apiClient,
    VoxoSocket? socket,
  }) : _api = apiClient ?? VoxoApiClient(config),
       _prefs = VoxoDevicePrefs(config) {
    _deps = VoxoControllerDeps(
      config: config,
      api: _api,
      state: _state,
      rateLimiter: _rateLimiter,
      socket: socket,
      prefs: _prefs,
      onChanged: _notify,
      onError: reportError,
      onHandoff: _applyHandoff,
      onConnectivity: _applyConnectivity,
      onSystemMessage: _addAssistantMessage,
      onSessionReplaced: _adoptNewSession,
      userId: () => _userId,
      isTypingEligible: () =>
          chatbot.features.liveTypingPreview && handoff.isHandledByHuman,
      isActive: () => _isOpen && !_state.sessionEnded,
      onPersist: _persist,
      ensureOpenSession: startNewSession,
    );
  }

  final VoxoConfig config;
  final VoxoApiClient _api;
  final VoxoDevicePrefs _prefs;
  final VoxoConversationState _state = VoxoConversationState();
  final VoxoRateLimiter _rateLimiter = VoxoRateLimiter();

  late final VoxoControllerDeps _deps;

  VoxoConversationSync get _sync => _deps.sync;
  VoxoComposer get _composer => _deps.composer;
  VoxoFeedbackService get _feedback => _deps.feedback;
  VoxoRealtimeBinder get _realtime => _deps.realtime;
  VoxoPushRegistrar get _push => _deps.push;
  VoxoTypingSender get _typing => _deps.typing;

  /// File des pièces jointes en attente d'être rattachées au prochain message.
  VoxoAttachmentQueue get attachments => _deps.attachments;

  VoxoChatbotConfig chatbot = const VoxoChatbotConfig();
  VoxoConnectivity connectivity = VoxoConnectivity.connecting;
  VoxoHandoff handoff = const VoxoHandoff();

  void setLocale(String locale) {
    config.locale = locale == 'en' ? 'en' : 'fr';
    unawaited(_prefs.saveLocale(config.locale));
    notifyListeners();
  }

  bool _isReady = false;
  bool _isOpen = false;
  bool _disposed = false;
  String _userId = '';
  String? _lastError;

  List<VoxoMessage> get messages => _state.ordered;
  String get sessionId => _state.sessionId;
  bool get sessionEnded => _state.sessionEnded;
  bool get isLoading => _composer.isSending;
  bool get isReady => _isReady;

  /// Une note de fin ne se propose qu'une fois l'assistant ayant répondu, et si
  /// le propriétaire a laissé la fonctionnalité active.
  bool get canRate =>
      chatbot.features.conversationRating && _state.hasServerReply;

  /// Dernier message d'erreur à afficher, puis à consommer via [clearError].
  String? get lastError => _lastError;

  /// Historique local des conversations terminées.
  Future<List<VoxoArchivedConversation>> history() => _sync.history();

  /// Prépare la conversation : session restaurée, configuration distante,
  /// message d'accueil, flux temps réel.
  Future<void> init() async {
    if (_isReady || _disposed) return;

    config.locale = await _prefs.loadLocale() ?? config.locale;

    _userId = await _sync.userId();
    final reminderCount = await _sync.restore();

    final (chatbotConfig, state) = await _sync.loadConfig();
    if (_disposed) return;
    chatbot = chatbotConfig;
    connectivity = state;
    attachments.applyServerLimits(
      maxFiles: chatbot.maxAttachments,
      maxBytes: chatbot.maxAttachmentBytes,
    );

    if (_state.isEmpty) await _addWelcomeMessage();
    if (_disposed) return;

    _realtime.start(
      reminderCount: reminderCount,
      enableInactivity: config.options.enableInactivityMonitor,
    );
    // Le fil réel fait foi sur ce qui a été restauré localement : un agent a pu
    // répondre pendant que l'application était fermée.
    unawaited(_realtime.refreshHistory());

    await _push.load();
    await _push.syncSession();

    _isReady = true;
    _notify();
  }

  /// Signale que le panneau de chat est visible : l'inactivité n'est surveillée
  /// que dans ce cas, comme sur le widget web.
  void setOpen(bool isOpen) {
    _isOpen = isOpen;
    if (!isOpen) return;
    _realtime.touch();
    unawaited(_realtime.refreshConnectivity(force: true));
  }

  /// À appeler à chaque frappe pour repousser la clôture automatique.
  void notifyUserActivity() => _realtime.touch();

  /// Envoie [text] avec les pièces jointes prêtes dans [attachments].
  Future<void> sendMessage(String text) {
    // Efface l'aperçu chez le conseiller avant que le message n'arrive.
    _typing.submit('');
    return _composer.send(text);
  }

  /// À appeler à chaque modification du champ de saisie. Sans effet hors aperçu
  /// de saisie autorisé (voir `CONTRACT.md`).
  void notifyTyping(String text) => _typing.submit(text);

  /// Confie le jeton FCM/APNs obtenu par l'application hôte, lié à la session
  /// courante. Sans effet visible si le propriétaire n'a pas activé les
  /// notifications ; une panne n'est jamais affichée.
  Future<void> registerPushToken(String token, VoxoPushPlatform platform) =>
      _push.register(token, platform);

  /// Oublie le jeton (déconnexion de l'utilisateur dans l'application hôte).
  Future<void> unregisterPushToken() => _push.unregister();

  /// Relit une conversation archivée en lecture seule ; la session active n'est
  /// pas modifiée. Une conversation purgée lève `HISTORY_UNAVAILABLE`.
  Future<VoxoArchivedView> archivedConversation(String sessionId) =>
      _sync.loadArchived(sessionId);

  /// Rejoue un message en échec, sans re-téléverser ses pièces jointes.
  Future<void> retry(String messageId) => _composer.retry(messageId);

  /// Pouce haut/bas sur une réponse. Sans effet si le propriétaire a désactivé
  /// la fonctionnalité depuis son dashboard.
  Future<void> submitFeedback(VoxoMessage message, VoxoFeedback value) async {
    if (!chatbot.features.messageFeedback) return;
    await _feedback.submitMessageFeedback(message, value);
    await _persist();
  }

  /// Clôt la conversation avec une note de 1 à 5 et un commentaire facultatif.
  Future<bool> endConversation({int? rating, String? feedback}) async {
    final closed = await _feedback.endConversation(
      rating: rating,
      feedback: feedback,
    );
    if (closed) await _persist();
    return closed;
  }

  /// Archive la conversation courante et en ouvre une neuve.
  Future<void> startNewSession() async {
    await _sync.archive(_state.sessionId, _state.messages);
    _state.reset();
    _rateLimiter.reset();
    handoff = const VoxoHandoff();
    _realtime.reconnect();
    await _addWelcomeMessage();
    await _persist();
    await _push.syncSession();
    _notify();
  }

  /// Remonte un message destiné à l'utilisateur. Public pour qu'une UI maison
  /// puisse signaler ses propres échecs par le même canal.
  void reportError(String message) {
    _lastError = message;
    _notify();
  }

  void clearError() {
    if (_lastError == null) return;
    _lastError = null;
    _notify();
  }

  /// Le serveur a basculé la conversation sur une session neuve : l'ancienne
  /// part à l'archive et le flux temps réel suit la nouvelle.
  Future<void> _adoptNewSession(String previousSessionId) async {
    await _sync.archive(previousSessionId, _state.messages);
    _realtime.reconnect();
    await _push.syncSession();
  }

  /// Message d'accueil produit localement, accompagné des suggestions de
  /// démarrage. Il n'est jamais envoyé au serveur.
  Future<void> _addWelcomeMessage() async {
    if (!_state.isEmpty) return;
    final suggestions = await _sync.quickReplies();
    if (_disposed || !_state.isEmpty) return;

    _state.add(
      VoxoMessage(
        role: VoxoRole.assistant,
        text: chatbot.welcomeMessage,
        suggestions: suggestions,
        isWelcome: true,
      ),
    );
    _notify();
  }

  void _addAssistantMessage(String text) {
    _state.add(VoxoMessage(role: VoxoRole.assistant, text: text));
    unawaited(_persist());
    _notify();
  }

  void _applyHandoff(VoxoHandoff value) {
    handoff = value;
    _notify();
  }

  void _applyConnectivity(VoxoConnectivity value) {
    if (connectivity == value) return;
    connectivity = value;
    _notify();
  }

  /// Notification gardée : une requête lancée avant `dispose` peut aboutir
  /// après, et notifier un `ChangeNotifier` disposé lève une assertion.
  void _notify() {
    if (_disposed) return;
    notifyListeners();
  }

  Future<void> _persist() =>
      _sync.persist(reminderCount: _realtime.reminderCount);

  @override
  void dispose() {
    _disposed = true;
    _typing.dispose();
    _realtime.dispose();
    _api.dispose();
    super.dispose();
  }
}
