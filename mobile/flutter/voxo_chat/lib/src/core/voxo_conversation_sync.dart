import '../models/voxo_chatbot_config.dart';
import '../models/voxo_handoff.dart';
import '../models/voxo_message.dart';
import 'voxo_api_client.dart';
import 'voxo_archived_view.dart';
import 'voxo_config.dart';
import 'voxo_conversation_state.dart';
import 'voxo_exception.dart';
import 'voxo_session_store.dart';
import 'voxo_socket.dart';
import '../voxo_i18n.dart';

/// Tout ce qui synchronise l'état local avec le serveur et le stockage.
///
/// Extrait du controller pour que celui-ci reste lisible : ici, la
/// configuration distante, l'historique, la persistance, le flux temps réel et
/// la sonde de connectivité. Aucune décision d'UI n'est prise dans ce fichier.
class VoxoConversationSync {
  VoxoConversationSync({
    required VoxoApiClient api,
    required VoxoSocket socket,
    required VoxoSessionStore store,
    required VoxoConversationState state,
    required this.config,
  })  : _api = api,
        _socket = socket,
        _store = store,
        _state = state;

  final VoxoApiClient _api;
  final VoxoSocket _socket;
  final VoxoSessionStore _store;
  final VoxoConversationState _state;
  final VoxoConfig config;

  DateTime? _lastHealthCheck;

  Stream<VoxoSocketEvent> get events => _socket.events;

  void connectSocket() => _socket.connect(_state.sessionId);

  bool sendTyping(String text) => _socket.sendTyping(text);

  void disposeSocket() => _socket.dispose();

  Future<String> userId() => _store.userId();

  /// Recharge la session persistée et renvoie le nombre de relances
  /// d'inactivité déjà émises, pour reprendre le décompte là où il s'était
  /// arrêté. Sans session fraîche, l'état reste celui d'une conversation neuve.
  Future<int> restore() async {
    final snapshot = await _store.restore();
    if (snapshot == null) return 0;

    _state.sessionId = snapshot.sessionId;
    _state.messages
      ..clear()
      ..addAll(snapshot.messages);
    _state.messageCount = snapshot.messageCount;
    _state.conversationStartedAt = snapshot.conversationStartedAt;
    _state.sessionEnded = snapshot.sessionEnded;
    return snapshot.inactivityReminderCount;
  }

  /// Charge la configuration décidée par le propriétaire du chatbot. En cas
  /// d'échec, on garde les valeurs par défaut : un thème générique vaut mieux
  /// qu'un écran vide.
  Future<(VoxoChatbotConfig, VoxoConnectivity)> loadConfig() async {
    try {
      final data = await _api.getConfig();
      final chatbot = data['chatbot'];
      return (
        chatbot is Map<String, dynamic>
            ? VoxoChatbotConfig.fromJson(chatbot, locale: config.locale)
            : VoxoChatbotConfig(
                welcomeMessage: VoxoI18n.text(config.locale, 'defaultWelcome'),
              ),
        VoxoConnectivity.available,
      );
    } on VoxoException {
      return (
        VoxoChatbotConfig(
          welcomeMessage: VoxoI18n.text(config.locale, 'defaultWelcome'),
        ),
        VoxoConnectivity.unavailable,
      );
    }
  }

  /// Suggestions de démarrage. Une indisponibilité n'est pas bloquante : le
  /// message d'accueil s'affiche sans réponses rapides.
  Future<List<String>> quickReplies() async {
    try {
      final data = await _api.getQuickReplies();
      return (data['suggestions'] as List?)?.whereType<String>().toList() ??
          const [];
    } on VoxoException {
      return const [];
    }
  }

  /// Recharge le fil depuis le serveur et renvoie l'état de reprise humaine.
  ///
  /// Un `404` est le cas **normal** d'une session neuve : la conversation
  /// n'existe pas encore côté serveur. On renvoie `null` sans rien changer, et
  /// surtout sans remonter d'erreur à l'utilisateur.
  Future<VoxoHandoff?> syncHistory() async {
    try {
      final data = await _api.getConversation(_state.sessionId);
      final rawMessages = data['messages'];
      if (rawMessages is List) {
        _state.replaceWithHistory(
          rawMessages
              .whereType<Map<String, dynamic>>()
              .map(VoxoMessage.fromHistory)
              .toList(),
        );
      }
      return VoxoHandoff.fromJson(data);
    } on VoxoException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  /// Relit une conversation archivée **sans toucher** à la session active. Une
  /// conversation purgée côté serveur (404) devient « Historique indisponible »,
  /// jamais une erreur technique.
  Future<VoxoArchivedView> loadArchived(String sessionId) async {
    try {
      final data = await _api.getConversation(sessionId, limit: 100);
      final raw = data['messages'];
      return VoxoArchivedView(
        messages: raw is List
            ? raw
                .whereType<Map<String, dynamic>>()
                .map(VoxoMessage.fromHistory)
                .fold<Map<String, VoxoMessage>>({}, (unique, message) {
                  // Dédoublonné par id : l'UI s'en sert comme clé de liste.
                  unique.putIfAbsent(message.id, () => message);
                  return unique;
                })
                .values
                .toList()
            : const [],
        handoff: VoxoHandoff.fromJson(data),
      );
    } on VoxoException catch (error) {
      if (!error.isNotFound) rethrow;
      throw VoxoException(
        VoxoI18n.text(config.locale, 'historyUnavailable'),
        code: 'HISTORY_UNAVAILABLE',
        statusCode: 404,
      );
    }
  }

  Future<void> persist({required int reminderCount}) => _store.save(
        sessionId: _state.sessionId,
        messages: _state.messages,
        messageCount: _state.messageCount,
        inactivityReminderCount: reminderCount,
        sessionEnded: _state.sessionEnded,
        conversationStartedAt: _state.conversationStartedAt,
        user: config.user,
      );

  Future<void> archive(String sessionId, List<VoxoMessage> messages) =>
      _store.archive(sessionId, messages);

  Future<List<VoxoArchivedConversation>> history() => _store.history();

  /// Clôture après relances d'inactivité. Le motif est imposé par la route.
  Future<void> endForInactivity() => _api.endConversationForInactivity(
        _state.sessionId,
        sessionDurationMs: _state.durationMs,
        messageCount: _state.messageCount,
      );

  /// Sonde `GET /widget/health`, au plus une fois par minute sauf [force].
  Future<VoxoConnectivity?> checkConnectivity({bool force = false}) async {
    final now = DateTime.now();
    if (!force &&
        _lastHealthCheck != null &&
        now.difference(_lastHealthCheck!) < const Duration(seconds: 55)) {
      return null;
    }
    _lastHealthCheck = now;
    return await _api.isHealthy()
        ? VoxoConnectivity.available
        : VoxoConnectivity.unavailable;
  }
}
