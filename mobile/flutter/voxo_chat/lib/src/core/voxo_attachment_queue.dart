import 'dart:io';

import '../file_rules.dart';
import '../models/voxo_attachment.dart';
import '../voxo_i18n.dart';
import 'voxo_api_client.dart';
import 'voxo_config.dart';
import 'voxo_exception.dart';
import 'voxo_image_compressor.dart';
import 'voxo_uuid.dart';

/// File des pièces jointes en attente d'être rattachées à un message.
///
/// Chaque élément traverse trois états — compression, envoi, prêt — repris de
/// `widget/src/attachments.js`. Une pièce qui échoue est retirée de la file : le
/// serveur n'a rien à en faire, et l'utilisateur est prévenu par [onError].
class VoxoAttachmentQueue {
  VoxoAttachmentQueue({
    required VoxoApiClient api,
    required VoxoConfig config,
    required this.onChanged,
    required this.onError,
    this.maxFiles = VoxoFileRules.maxAttachmentsPerMessage,
    this.maxBytes = VoxoFileRules.maxFileBytes,
  })  : _api = api,
        _config = config;

  final VoxoApiClient _api;
  final VoxoConfig _config;

  /// Notifie l'UI d'un changement de la file.
  final void Function() onChanged;

  /// Remonte un message d'erreur français, affichable tel quel.
  final void Function(String message) onError;

  /// Limites annoncées par `GET /widget/config`, à défaut celles du miroir local.
  int maxFiles;
  int maxBytes;

  final List<VoxoPendingAttachment> _items = [];

  List<VoxoPendingAttachment> get items => List.unmodifiable(_items);

  /// Pièces effectivement envoyées, seules rattachables à un message.
  List<VoxoPendingAttachment> get uploaded =>
      _items.where((item) => item.isUploaded).toList();

  List<String> get uploadedIds =>
      uploaded.map((item) => item.remoteId!).toList();

  /// Un envoi est en cours : le message doit attendre.
  bool get isUploading =>
      _items.any((item) => !item.isUploaded && !item.failed);

  bool get isEmpty => _items.isEmpty;

  int get remainingSlots => maxFiles - _items.length;

  /// Ajoute des fichiers : compression, validation, puis envoi, dans cet ordre —
  /// la limite de taille porte sur ce qui part réellement sur le réseau.
  Future<void> addAll(List<String> paths) async {
    if (paths.isEmpty) return;

    final room = remainingSlots;
    if (room <= 0) {
      onError(VoxoI18n.text(_config.locale, 'maxAttachmentsError', {'count': maxFiles}));
      return;
    }
    if (paths.length > room) {
      onError(VoxoI18n.text(_config.locale, 'remainingSlotsError', {'count': room}));
    }

    for (final path in paths.take(room)) {
      await _addOne(path);
    }
  }

  Future<void> _addOne(String path) async {
    final prepared = await VoxoImageCompressor.compress(path);
    final name = prepared.split(RegExp(r'[/\\]')).last;

    final int size;
    try {
      size = await File(prepared).length();
    } on FileSystemException {
      onError(VoxoI18n.text(_config.locale, 'fileUnreadable'));
      return;
    }

    final validation = VoxoFileRules.validate(
      name,
      size,
      maxBytes: maxBytes,
      locale: _config.locale,
    );
    if (!validation.isValid) {
      onError(validation.error!);
      return;
    }

    final item = VoxoPendingAttachment(
      localId: VoxoUuid.v4(),
      name: name,
      size: size,
      category: validation.category!,
      path: prepared,
    );
    _items.add(item);
    onChanged();

    try {
      final data = await _api.uploadAttachment(prepared);
      final id = data['id'] as String?;
      if (id == null || id.isEmpty) throw VoxoException.malformedResponse();
      item.remoteId = id;
      onChanged();
    } on VoxoException catch (error) {
      item.failed = true;
      _items.remove(item);
      onChanged();
      onError(error.message);
    }
  }

  void remove(String localId) {
    _items.removeWhere((item) => item.localId == localId);
    onChanged();
  }

  /// Vide la file une fois les pièces rattachées à un message envoyé.
  void clear() {
    if (_items.isEmpty) return;
    _items.clear();
    onChanged();
  }

  /// Aligne les limites sur celles annoncées par le serveur.
  void applyServerLimits({required int maxFiles, required int maxBytes}) {
    this.maxFiles = maxFiles;
    this.maxBytes = maxBytes;
  }
}
