import 'package:flutter/material.dart';

import '../../models/voxo_chatbot_config.dart';
import '../../models/voxo_message.dart';
import '../../theme/voxo_theme.dart';
import '../markdown/voxo_markdown_body.dart';
import '../voxo_date_labels.dart';
import 'voxo_message_footer.dart';

/// Une bulle du fil de conversation.
///
/// Trois traitements visuels, parce que l'utilisateur doit savoir à qui il
/// parle : lui-même (couleur d'accent, à droite), l'assistant (fond neutre) et
/// un conseiller humain (teinte d'accent diluée, avec son nom).
class VoxoMessageBubble extends StatelessWidget {
  const VoxoMessageBubble({
    required this.message,
    required this.features,
    required this.markdown,
    required this.agentName,
    this.onFeedback,
    this.onRetry,
    this.onLinkTap,
    this.locale = 'fr',
    super.key,
  });

  final VoxoMessage message;
  final VoxoFeatures features;
  final bool markdown;

  /// Nom du conseiller, affiché au-dessus de ses messages.
  final String? agentName;

  final void Function(VoxoFeedback value)? onFeedback;
  final VoidCallback? onRetry;
  final void Function(String url)? onLinkTap;
  final String locale;

  bool get _isUser => message.role == VoxoRole.user;
  bool get _isAgent => message.role == VoxoRole.agent;

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);
    final background = _isUser
        ? theme.userBubble
        : _isAgent
            ? theme.agentBubble
            : theme.botBubble;
    final foreground = _isUser ? theme.onUserBubble : theme.onBotBubble;

    return Align(
      alignment: _isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        child: Column(
          crossAxisAlignment:
              _isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (_isAgent && agentName != null) _agentLabel(theme),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: background,
                borderRadius: _bubbleRadius(theme),
                border: _isAgent ? Border.all(color: theme.accent, width: 1) : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (message.attachments.isNotEmpty)
                    VoxoAttachmentList(
                      attachments: message.attachments,
                      foreground: foreground,
                    ),
                  if (message.text.isNotEmpty)
                    VoxoMarkdownBody(
                      text: message.text,
                      color: foreground,
                      markdown: markdown,
                      onLinkTap: onLinkTap,
                    ),
                ],
              ),
            ),
            VoxoMessageFooter(
              message: message,
              features: features,
              timeLabel: VoxoDateLabels.time(message.timestamp),
              onFeedback: onFeedback,
              onRetry: onRetry,
              locale: locale,
            ),
          ],
        ),
      ),
    );
  }

  Widget _agentLabel(VoxoTheme theme) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 3),
        child: Text(
          agentName!,
          style: TextStyle(
            color: theme.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      );

  /// Le coin côté auteur est rogné : c'est ce qui donne l'orientation de la
  /// bulle sans avoir besoin d'une pointe.
  BorderRadius _bubbleRadius(VoxoTheme theme) {
    final radius = Radius.circular(theme.radius);
    const tight = Radius.circular(4);
    return BorderRadius.only(
      topLeft: radius,
      topRight: radius,
      bottomLeft: _isUser ? radius : tight,
      bottomRight: _isUser ? tight : radius,
    );
  }
}
