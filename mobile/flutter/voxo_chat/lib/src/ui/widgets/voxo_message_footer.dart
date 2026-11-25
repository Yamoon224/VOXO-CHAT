import 'package:flutter/material.dart';

import '../../models/voxo_attachment.dart';
import '../../models/voxo_chatbot_config.dart';
import '../../models/voxo_message.dart';
import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';

/// Ligne discrète sous une bulle : heure, statut de livraison, avis.
///
/// Chaque élément est conditionné par une fonctionnalité que le propriétaire du
/// chatbot peut couper depuis son dashboard.
class VoxoMessageFooter extends StatelessWidget {
  const VoxoMessageFooter({
    required this.message,
    required this.features,
    required this.timeLabel,
    this.onFeedback,
    this.onRetry,
    this.locale = 'fr',
    super.key,
  });

  final VoxoMessage message;
  final VoxoFeatures features;
  final String timeLabel;
  final void Function(VoxoFeedback value)? onFeedback;
  final VoidCallback? onRetry;
  final String locale;

  bool get _showFeedback =>
      features.messageFeedback &&
      message.canReceiveFeedback &&
      onFeedback != null;

  bool get _showStatus =>
      features.showDeliveryStatus && message.isFromUser && !message.hasFailed;

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);

    if (message.hasFailed) return _failure(theme);

    final children = <Widget>[
      if (features.showTimestamps) _muted(timeLabel, theme),
      if (_showStatus) ...[
        const SizedBox(width: 4),
        Icon(
          message.deliveryStatus == VoxoDeliveryStatus.answered
              ? Icons.done_all
              : Icons.schedule,
          size: 13,
          color: theme.textMuted,
        ),
      ],
      if (_showFeedback) ...[
        const SizedBox(width: 6),
        _feedbackButton(VoxoFeedback.up, Icons.thumb_up_outlined,
            Icons.thumb_up, VoxoI18n.text(locale, 'feedbackUseful'), theme),
        _feedbackButton(VoxoFeedback.down, Icons.thumb_down_outlined,
            Icons.thumb_down, VoxoI18n.text(locale, 'feedbackNotUseful'), theme),
      ],
    ];

    if (children.isEmpty) return const SizedBox(height: 6);

    return Padding(
      padding: const EdgeInsets.only(top: 3, left: 4, right: 4, bottom: 4),
      child: Row(mainAxisSize: MainAxisSize.min, children: children),
    );
  }

  /// Un envoi raté doit rester actionnable : le texte et les pièces jointes
  /// sont conservés, un appui relance l'envoi sans les re-téléverser.
  Widget _failure(VoxoTheme theme) => Padding(
        padding: const EdgeInsets.only(top: 3, right: 4, bottom: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 13, color: theme.danger),
            const SizedBox(width: 4),
            Text(
              VoxoI18n.text(locale, 'messageFailed'),
              style: TextStyle(color: theme.danger, fontSize: 11),
            ),
            if (onRetry != null) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onRetry,
                child: Text(
                  VoxoI18n.text(locale, 'retryLabel'),
                  style: TextStyle(
                    color: theme.accent,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ],
        ),
      );

  Widget _feedbackButton(
    VoxoFeedback value,
    IconData outlined,
    IconData filled,
    String label,
    VoxoTheme theme,
  ) {
    final isSelected = message.feedback == value;
    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      child: InkResponse(
        onTap: () => onFeedback!(value),
        radius: 16,
        child: Padding(
          padding: const EdgeInsets.all(3),
          child: Icon(
            isSelected ? filled : outlined,
            size: 14,
            color: isSelected ? theme.accent : theme.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _muted(String value, VoxoTheme theme) =>
      Text(value, style: TextStyle(color: theme.textMuted, fontSize: 11));
}

/// Pièces jointes portées par un message reçu ou envoyé.
///
/// Les images arrivent avec une URL signée qui expire : un échec de chargement
/// retombe sur la tuile de fichier plutôt que sur une icône cassée.
class VoxoAttachmentList extends StatelessWidget {
  const VoxoAttachmentList({
    required this.attachments,
    required this.foreground,
    super.key,
  });

  final List<VoxoAttachment> attachments;
  final Color foreground;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final attachment in attachments)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: _tile(attachment),
              ),
          ],
        ),
      );

  Widget _tile(VoxoAttachment attachment) {
    if (attachment.isImage && attachment.url != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          attachment.url!,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => _fileRow(attachment),
        ),
      );
    }
    return _fileRow(attachment);
  }

  Widget _fileRow(VoxoAttachment attachment) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            attachment.isImage ? Icons.image_outlined : Icons.description_outlined,
            size: 15,
            color: foreground,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              attachment.name,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: foreground, fontSize: 13),
            ),
          ),
        ],
      );
}
