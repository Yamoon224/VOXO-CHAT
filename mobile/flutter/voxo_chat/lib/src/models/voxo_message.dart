import '../core/voxo_uuid.dart';
import 'voxo_attachment.dart';

/// Auteur d'un message. `internal_note` n'est jamais exposé au widget par le
/// backend : il n'a pas d'équivalent ici.
enum VoxoRole { user, assistant, agent }

VoxoRole roleFromApi(String? value) => switch (value) {
      'user' => VoxoRole.user,
      'agent' => VoxoRole.agent,
      _ => VoxoRole.assistant,
    };

/// Progression de l'envoi d'un message utilisateur.
enum VoxoDeliveryStatus { sending, answered, failed }

VoxoDeliveryStatus? deliveryStatusFromName(String? value) => switch (value) {
      'sending' => VoxoDeliveryStatus.sending,
      'answered' => VoxoDeliveryStatus.answered,
      'failed' => VoxoDeliveryStatus.failed,
      _ => null,
    };

/// Avis exprimé sur une réponse.
enum VoxoFeedback { up, down }

VoxoFeedback? feedbackFromApi(Object? value) => switch (value) {
      'up' => VoxoFeedback.up,
      'down' => VoxoFeedback.down,
      _ => null,
    };

/// Un message du fil de conversation.
///
/// [id] est l'identifiant **local**, un UUID v4 qui sert aussi de
/// `clientMessageId` — c'est lui qui porte l'idempotence côté serveur. [serverId]
/// est l'identifiant attribué par le backend ; il n'existe qu'une fois le
/// message accepté, et c'est le seul utilisable pour le feedback.
class VoxoMessage {
  VoxoMessage({
    String? id,
    this.serverId,
    required this.role,
    required this.text,
    DateTime? timestamp,
    this.suggestions = const [],
    this.attachments = const [],
    this.deliveryStatus,
    this.feedback,
    this.messageIndex,
    this.isWelcome = false,
    this.pendingAttachmentIds = const [],
  })  : id = id ?? VoxoUuid.v4(),
        timestamp = timestamp ?? DateTime.now();

  final String id;
  String? serverId;
  final VoxoRole role;
  final String text;
  final DateTime timestamp;

  /// Réponses rapides proposées sous le message.
  final List<String> suggestions;
  final List<VoxoAttachment> attachments;

  VoxoDeliveryStatus? deliveryStatus;
  VoxoFeedback? feedback;

  /// Rang du message dans la conversation, renvoyé par l'historique. Sert de
  /// repli pour cibler un feedback quand [serverId] manque.
  int? messageIndex;

  /// Message d'accueil produit localement : jamais annoncé aux lecteurs
  /// d'écran, jamais envoyé au serveur.
  final bool isWelcome;

  /// Identifiants serveur des pièces déjà envoyées, conservés pour pouvoir
  /// réessayer le message sans re-téléverser les fichiers.
  final List<String> pendingAttachmentIds;

  bool get isFromUser => role == VoxoRole.user;
  bool get hasFailed => deliveryStatus == VoxoDeliveryStatus.failed;

  /// Un feedback ne peut cibler qu'un message que le serveur connaît.
  bool get canReceiveFeedback =>
      role != VoxoRole.user && (serverId != null || messageIndex != null);

  VoxoMessage copyWith({
    String? serverId,
    VoxoDeliveryStatus? deliveryStatus,
    VoxoFeedback? feedback,
    bool clearFeedback = false,
    int? messageIndex,
    List<VoxoAttachment>? attachments,
  }) =>
      VoxoMessage(
        id: id,
        serverId: serverId ?? this.serverId,
        role: role,
        text: text,
        timestamp: timestamp,
        suggestions: suggestions,
        attachments: attachments ?? this.attachments,
        deliveryStatus: deliveryStatus ?? this.deliveryStatus,
        feedback: clearFeedback ? null : (feedback ?? this.feedback),
        messageIndex: messageIndex ?? this.messageIndex,
        isWelcome: isWelcome,
        pendingAttachmentIds: pendingAttachmentIds,
      );

  /// Message tel que le renvoie `GET /widget/conversation/:sessionId`.
  factory VoxoMessage.fromHistory(Map<String, dynamic> json) {
    final rawAttachments = json['attachments'];
    return VoxoMessage(
      id: json['id'] as String? ?? VoxoUuid.v4(),
      serverId: json['id'] as String?,
      role: roleFromApi(json['role'] as String?),
      text: json['content'] as String? ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ??
          DateTime.now(),
      attachments: rawAttachments is List
          ? rawAttachments
              .whereType<Map<String, dynamic>>()
              .map(VoxoAttachment.fromJson)
              .toList()
          : const [],
      feedback: feedbackFromApi(json['feedback']),
      messageIndex: (json['messageIndex'] as num?)?.toInt(),
      deliveryStatus: json['role'] == 'user' ? VoxoDeliveryStatus.answered : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'serverId': serverId,
        'role': role.name,
        'text': text,
        'timestamp': timestamp.toIso8601String(),
        'suggestions': suggestions,
        'attachments': attachments.map((item) => item.toJson()).toList(),
        'deliveryStatus': deliveryStatus?.name,
        'feedback': feedback?.name,
        'messageIndex': messageIndex,
        'isWelcome': isWelcome,
        'pendingAttachmentIds': pendingAttachmentIds,
      };

  factory VoxoMessage.fromJson(Map<String, dynamic> json) => VoxoMessage(
        id: json['id'] as String?,
        serverId: json['serverId'] as String?,
        role: json['role'] == 'user'
            ? VoxoRole.user
            : json['role'] == 'agent'
                ? VoxoRole.agent
                : VoxoRole.assistant,
        text: json['text'] as String? ?? '',
        timestamp: DateTime.tryParse(json['timestamp'] as String? ?? ''),
        suggestions: (json['suggestions'] as List?)?.cast<String>() ?? const [],
        attachments: (json['attachments'] as List?)
                ?.whereType<Map<String, dynamic>>()
                .map(VoxoAttachment.fromJson)
                .toList() ??
            const [],
        deliveryStatus:
            deliveryStatusFromName(json['deliveryStatus'] as String?),
        feedback: feedbackFromApi(json['feedback']),
        messageIndex: (json['messageIndex'] as num?)?.toInt(),
        isWelcome: json['isWelcome'] as bool? ?? false,
        pendingAttachmentIds:
            (json['pendingAttachmentIds'] as List?)?.cast<String>() ?? const [],
      );
}
