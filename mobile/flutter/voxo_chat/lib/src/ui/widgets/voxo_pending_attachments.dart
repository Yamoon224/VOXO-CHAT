import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/voxo_attachment_queue.dart';
import '../../file_rules.dart';
import '../../models/voxo_attachment.dart';
import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';

/// Pièces jointes préparées mais pas encore rattachées à un message.
///
/// L'état d'envoi est visible : tant qu'une pièce tourne, le message ne peut
/// pas partir — son identifiant serveur n'existe pas encore.
class VoxoPendingAttachments extends StatelessWidget {
  const VoxoPendingAttachments({
    required this.queue,
    this.locale = 'fr',
    super.key,
  });

  final VoxoAttachmentQueue queue;
  final String locale;

  @override
  Widget build(BuildContext context) {
    if (queue.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4, right: 4),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final item in queue.items)
            _VoxoPendingChip(
              item: item,
              locale: locale,
              onRemove: () => queue.remove(item.localId),
            ),
        ],
      ),
    );
  }
}

class _VoxoPendingChip extends StatelessWidget {
  const _VoxoPendingChip({
    required this.item,
    required this.onRemove,
    this.locale = 'fr',
  });

  final VoxoPendingAttachment item;
  final VoidCallback onRemove;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);

    return Container(
      padding: const EdgeInsets.fromLTRB(6, 5, 4, 5),
      decoration: BoxDecoration(
        color: theme.surfaceMuted,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _preview(theme),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 130),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: theme.text, fontSize: 12),
                ),
                Text(
                  item.isUploaded
                      ? VoxoFileRules.formatSize(item.size, locale: locale)
                      : VoxoI18n.text(locale, 'uploadingLabel'),
                  style: TextStyle(color: theme.textMuted, fontSize: 10),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.close, size: 15),
            color: theme.textMuted,
            visualDensity: VisualDensity.compact,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            padding: EdgeInsets.zero,
            tooltip: VoxoI18n.text(locale, 'removeAttachment', {'name': item.name}),
          ),
        ],
      ),
    );
  }

  Widget _preview(VoxoTheme theme) {
    if (!item.isUploaded) {
      return SizedBox(
        width: 28,
        height: 28,
        child: Center(
          child: SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: theme.accent,
            ),
          ),
        ),
      );
    }

    if (item.isImage) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.file(
          File(item.path),
          width: 28,
          height: 28,
          fit: BoxFit.cover,
          // Le fichier a pu être déplacé ou purgé entre-temps : on retombe sur
          // l'icône générique plutôt que sur une image cassée.
          errorBuilder: (context, error, stack) =>
              Icon(Icons.image_outlined, size: 18, color: theme.textMuted),
        ),
      );
    }

    return Icon(Icons.description_outlined, size: 18, color: theme.textMuted);
  }
}
