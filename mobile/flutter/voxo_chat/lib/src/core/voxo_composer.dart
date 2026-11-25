import '../voxo_i18n.dart';
import 'voxo_attachment_queue.dart';
import 'voxo_config.dart';
import 'voxo_conversation_state.dart';
import 'voxo_message_sender.dart';

/// Mécanique de la zone de saisie : garde-fous avant envoi, drapeau d'attente,
/// rattachement des pièces jointes, nouvel essai.
///
/// Séparé du controller, qui porte l'état de la conversation : ici on ne
/// s'occupe que du geste « envoyer ».
class VoxoComposer {
  VoxoComposer({
    required VoxoMessageSender sender,
    required VoxoAttachmentQueue attachments,
    required VoxoConversationState state,
    required VoxoConfig config,
    required this.onChanged,
    required this.onError,
    required this.onActivity,
    required this.onPersist,
    required this.ensureOpenSession,
  })  : _sender = sender,
        _attachments = attachments,
        _state = state,
        _config = config;

  final VoxoMessageSender _sender;
  final VoxoAttachmentQueue _attachments;
  final VoxoConversationState _state;
  final VoxoConfig _config;

  final void Function() onChanged;
  final void Function(String message) onError;

  /// Repousse la clôture automatique et remet les relances à zéro.
  final void Function() onActivity;

  final Future<void> Function() onPersist;

  /// Ouvre une session neuve quand la précédente a été clôturée.
  final Future<void> Function() ensureOpenSession;

  bool _isSending = false;

  /// Un envoi est en cours : la zone de saisie doit rester bloquée.
  bool get isSending => _isSending;

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (_isSending) return;

    // Rattacher une pièce dont l'upload n'est pas fini enverrait un
    // attachmentId encore inconnu du serveur.
    if (_attachments.isUploading) {
      onError(VoxoI18n.text(_config.locale, 'attachmentStillUploading'));
      return;
    }
    if (trimmed.isEmpty && _attachments.uploadedIds.isEmpty) return;

    if (_state.sessionEnded) await ensureOpenSession();

    _isSending = true;
    onActivity();
    onChanged();

    // La file est vidée avant l'appel : les pièces appartiennent désormais au
    // message, un second envoi ne doit pas les reprendre.
    final pending = _attachments.uploaded;
    final ids = _attachments.uploadedIds;
    _attachments.clear();

    await _sender.send(
      text: trimmed,
      attachmentIds: ids,
      attachments: pending,
    );

    await _finish();
  }

  /// Rejoue un message en échec. Son identifiant est conservé : le serveur le
  /// reconnaît et ne traitera pas l'envoi deux fois. Les pièces jointes sont
  /// déjà sur le serveur, seuls leurs identifiants sont renvoyés.
  Future<void> retry(String messageId) async {
    final message = _state.byId(messageId);
    if (message == null || !message.hasFailed || _isSending) return;

    _isSending = true;
    onChanged();

    await _sender.send(
      text: message.text,
      attachmentIds: message.pendingAttachmentIds,
      retryOf: message,
    );

    await _finish();
  }

  Future<void> _finish() async {
    _isSending = false;
    await onPersist();
    onChanged();
  }
}
