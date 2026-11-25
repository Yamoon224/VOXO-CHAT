import '../models/voxo_message.dart';
import 'voxo_limits.dart';
import 'voxo_uuid.dart';

/// Disponibilité du service telle que le SDK la perçoit.
enum VoxoConnectivity { connecting, available, unavailable }

/// Conteneur d'état du fil de conversation.
///
/// Purement synchrone : aucune notion de réseau, de persistance ni d'UI. Il
/// détient les messages et les compteurs, et sait les faire évoluer ; c'est le
/// controller qui décide *quand*.
class VoxoConversationState {
  VoxoConversationState({String? sessionId})
      : sessionId = sessionId ?? VoxoUuid.v4();

  String sessionId;
  final List<VoxoMessage> messages = [];

  /// Messages envoyés par l'utilisateur dans cette session, pour les métriques
  /// de clôture.
  int messageCount = 0;

  DateTime? conversationStartedAt;
  bool sessionEnded = false;

  /// Vue triée du fil, la plus ancienne en premier. L'historique serveur et les
  /// événements du socket peuvent arriver dans le désordre.
  ///
  /// Dédoublonnée par identifiant : un `id` répété (donnée serveur ou session
  /// restaurée corrompue) ferait planter les listes de l'UI, qui s'en servent
  /// comme clé.
  List<VoxoMessage> get ordered {
    final seen = <String>{};
    final sorted = messages.where((message) => seen.add(message.id)).toList()
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return List.unmodifiable(sorted);
  }

  bool get isEmpty => messages.isEmpty;

  /// Une note de fin n'a de sens qu'une fois l'assistant ayant répondu.
  bool get hasServerReply => messages.any(
        (message) => !message.isFromUser && message.serverId != null,
      );

  VoxoMessage? byId(String id) {
    for (final message in messages) {
      if (message.id == id) return message;
    }
    return null;
  }

  bool hasServerId(String? serverId) =>
      serverId != null &&
      messages.any((message) => message.serverId == serverId);

  /// Ajoute un message et applique le plafond mémoire en évinçant les plus
  /// anciens.
  VoxoMessage add(VoxoMessage message) {
    messages.add(message);
    if (message.isFromUser && !message.isWelcome) messageCount++;
    conversationStartedAt ??= DateTime.now();

    if (messages.length > VoxoLimits.maxMessagesInMemory) {
      messages.removeRange(
        0,
        messages.length - VoxoLimits.maxMessagesInMemory,
      );
    }
    return message;
  }

  /// Met à jour un message en place. Renvoie `null` s'il a déjà été évincé.
  VoxoMessage? update(
    String id, {
    String? serverId,
    VoxoDeliveryStatus? deliveryStatus,
    VoxoFeedback? feedback,
    bool clearFeedback = false,
  }) {
    final index = messages.indexWhere((message) => message.id == id);
    if (index == -1) return null;

    final updated = messages[index].copyWith(
      serverId: serverId,
      deliveryStatus: deliveryStatus,
      feedback: feedback,
      clearFeedback: clearFeedback,
    );
    messages[index] = updated;
    return updated;
  }

  /// Remplace tout le fil par l'historique serveur, en conservant les messages
  /// locaux encore en vol : un message en cours d'envoi ou en échec n'existe pas
  /// côté serveur et disparaîtrait sinon sous les yeux de l'utilisateur.
  void replaceWithHistory(List<VoxoMessage> history) {
    final inFlight = messages
        .where(
          (message) =>
              message.serverId == null &&
              !message.isWelcome &&
              message.deliveryStatus != VoxoDeliveryStatus.answered,
        )
        .toList();

    final welcome = messages.where((message) => message.isWelcome).toList();

    messages
      ..clear()
      // Le message d'accueil est produit localement : le serveur ne le renvoie
      // pas, et il doit rester en tête du fil.
      ..addAll(history.isEmpty ? welcome : const <VoxoMessage>[])
      ..addAll(history)
      ..addAll(inFlight);
  }

  /// Dernier message utilisateur en échec, cible naturelle d'un nouvel essai.
  VoxoMessage? get lastFailed {
    for (final message in messages.reversed) {
      if (message.isFromUser && message.hasFailed) return message;
    }
    return null;
  }

  /// Ouvre une session neuve en conservant l'identifiant du tenant.
  void reset({String? sessionId}) {
    this.sessionId = sessionId ?? VoxoUuid.v4();
    messages.clear();
    messageCount = 0;
    conversationStartedAt = null;
    sessionEnded = false;
  }

  /// Durée de la conversation en millisecondes, pour les payloads de clôture.
  int? get durationMs => conversationStartedAt == null
      ? null
      : DateTime.now().difference(conversationStartedAt!).inMilliseconds;
}
