import '../models/voxo_message.dart';
import '../voxo_i18n.dart';
import 'voxo_api_client.dart';
import 'voxo_config.dart';
import 'voxo_conversation_state.dart';
import 'voxo_exception.dart';

/// Avis de l'utilisateur sur la conversation : pouce haut/bas par réponse et
/// notation de fin.
///
/// Regroupé à part du controller car c'est un sujet distinct — ce que
/// l'utilisateur *pense* de l'échange, et non la conduite de l'échange.
class VoxoFeedbackService {
  VoxoFeedbackService({
    required VoxoApiClient api,
    required VoxoConfig config,
    required VoxoConversationState state,
    required this.onChanged,
    required this.onError,
  })  : _api = api,
        _config = config,
        _state = state;

  final VoxoApiClient _api;
  final VoxoConfig _config;
  final VoxoConversationState _state;
  final void Function() onChanged;
  final void Function(String message) onError;

  /// Pouce haut/bas. Rejouer la même valeur retire l'avis.
  ///
  /// L'affichage est optimiste : la valeur est posée tout de suite et revient
  /// en arrière si le serveur refuse. Un avis ne peut cibler qu'un message que
  /// le serveur connaît — d'où [VoxoMessage.canReceiveFeedback].
  Future<void> submitMessageFeedback(
    VoxoMessage message,
    VoxoFeedback value,
  ) async {
    if (!message.canReceiveFeedback) return;

    final previous = message.feedback;
    final next = previous == value ? null : value;
    _state.update(message.id, feedback: next, clearFeedback: next == null);
    onChanged();

    try {
      await _api.sendMessageFeedback(
        _state.sessionId,
        messageId: message.serverId,
        // Le rang ne sert que si le serveur n'a pas encore attribué d'id.
        messageIndex: message.serverId == null ? message.messageIndex : null,
        value: next?.name,
      );
    } on VoxoException {
      _state.update(
        message.id,
        feedback: previous,
        clearFeedback: previous == null,
      );
      onChanged();
      onError(VoxoI18n.text(_config.locale, 'feedbackSaveFailed'));
    }
  }

  /// Clôt la conversation avec une note de 1 à 5 et un commentaire facultatif.
  /// Renvoie `false` si le serveur a refusé : la session reste ouverte.
  Future<bool> endConversation({int? rating, String? feedback}) async {
    try {
      await _api.endConversation(
        _state.sessionId,
        rating: rating,
        feedback: feedback,
        sessionDurationMs: _state.durationMs,
        messageCount: _state.messageCount,
      );
      _state.sessionEnded = true;
      onChanged();
      return true;
    } on VoxoException catch (error) {
      onError(error.message);
      return false;
    }
  }
}
