import '../models/voxo_attachment.dart';
import '../models/voxo_message.dart';
import '../voxo_i18n.dart';
import 'voxo_api_client.dart';
import 'voxo_config.dart';
import 'voxo_conversation_state.dart';
import 'voxo_exception.dart';
import 'voxo_limits.dart';
import 'voxo_rate_limiter.dart';

/// Envoi d'un message et réconciliation de la réponse.
///
/// Extrait du controller pour que chacun garde une responsabilité lisible :
/// ici, tout ce qui se passe entre « l'utilisateur appuie sur envoyer » et
/// « le fil reflète la réponse du serveur ».
class VoxoMessageSender {
  VoxoMessageSender({
    required VoxoApiClient api,
    required VoxoConfig config,
    required VoxoConversationState state,
    required VoxoRateLimiter rateLimiter,
    required this.onChanged,
    required this.onError,
    required this.onSessionReplaced,
    required this.userId,
  })  : _api = api,
        _config = config,
        _state = state,
        _rateLimiter = rateLimiter;

  final VoxoApiClient _api;
  final VoxoConfig _config;
  final VoxoConversationState _state;
  final VoxoRateLimiter _rateLimiter;

  final void Function() onChanged;
  final void Function(String message) onError;

  /// Le serveur a ouvert une nouvelle conversation : l'ancienne session doit
  /// être archivée et le WebSocket reconnecté sur la nouvelle.
  final Future<void> Function(String previousSessionId) onSessionReplaced;

  final String Function() userId;

  /// Envoie [text] avec [attachmentIds]. [retryOf] rejoue un message en échec
  /// **sans changer son identifiant** : c'est lui qui porte l'idempotence, le
  /// serveur ne doit pas traiter deux fois le même envoi.
  ///
  /// Renvoie `true` si le serveur a accepté le message.
  Future<bool> send({
    required String text,
    List<String> attachmentIds = const [],
    List<VoxoPendingAttachment> attachments = const [],
    VoxoMessage? retryOf,
  }) async {
    if (text.isEmpty && attachmentIds.isEmpty) return false;

    if (text.length > VoxoLimits.maxMessageLength) {
      onError(
        VoxoI18n.text(_config.locale, 'messageTooLong',
            {'max': VoxoLimits.maxMessageLength}),
      );
      return false;
    }

    if (!_rateLimiter.tryConsume()) {
      onError(VoxoI18n.text(_config.locale, 'tooManyMessages'));
      return false;
    }

    final message = retryOf ?? _appendUserMessage(text, attachments, attachmentIds);
    _state.update(message.id, deliveryStatus: VoxoDeliveryStatus.sending);
    onChanged();

    try {
      final data = await _api.sendMessage(
        message: text,
        sessionId: _state.sessionId,
        clientMessageId: message.id,
        userId: userId(),
        userName: _config.user?.name,
        userEmail: _config.user?.email,
        attachmentIds: attachmentIds,
        metadata: const {'platform': 'mobile', 'sdk': 'flutter'},
      );

      await _applyResponse(data, message);
      return true;
    } on VoxoException catch (error) {
      _state.update(message.id, deliveryStatus: VoxoDeliveryStatus.failed);
      onChanged();
      onError(error.message);
      return false;
    }
  }

  VoxoMessage _appendUserMessage(
    String text,
    List<VoxoPendingAttachment> attachments,
    List<String> attachmentIds,
  ) =>
      _state.add(
        VoxoMessage(
          role: VoxoRole.user,
          text: text,
          deliveryStatus: VoxoDeliveryStatus.sending,
          pendingAttachmentIds: attachmentIds,
          attachments: attachments
              .map(
                (item) => VoxoAttachment(
                  id: item.remoteId ?? item.localId,
                  name: item.name,
                  category: item.category,
                  size: item.size,
                ),
              )
              .toList(),
        ),
      );

  Future<void> _applyResponse(
    Map<String, dynamic> data,
    VoxoMessage sent,
  ) async {
    // Le serveur peut avoir basculé la conversation sur une nouvelle session.
    final nextSessionId = data['sessionId'] as String?;
    if (nextSessionId != null && nextSessionId != _state.sessionId) {
      final previous = _state.sessionId;
      _state.sessionId = nextSessionId;
      await onSessionReplaced(previous);
    }

    _state.update(
      sent.id,
      serverId: data['userMessageId'] as String? ?? sent.id,
      deliveryStatus: VoxoDeliveryStatus.answered,
    );

    final assistantId = data['assistantMessageId'] as String?;
    final reply = data['response'] as String?;

    // Le socket a pu livrer la même réponse en parallèle : on ne l'ajoute
    // qu'une fois.
    if (reply != null && reply.isNotEmpty && !_state.hasServerId(assistantId)) {
      _state.add(
        VoxoMessage(
          id: assistantId,
          serverId: assistantId,
          role: VoxoRole.assistant,
          text: reply,
          suggestions:
              (data['suggestions'] as List?)?.whereType<String>().toList() ??
                  const [],
        ),
      );
    }

    onChanged();
  }
}
