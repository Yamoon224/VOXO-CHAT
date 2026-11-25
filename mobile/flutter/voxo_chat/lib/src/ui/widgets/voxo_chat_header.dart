import 'package:flutter/material.dart';

import '../../core/voxo_conversation_state.dart';
import '../../models/voxo_chatbot_config.dart';
import '../../models/voxo_handoff.dart';
import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';

/// En-tête du chat : avatar, nom du chatbot, état, actions.
///
/// Le sous-titre dit **une** chose à la fois, et la reprise humaine passe avant
/// la connectivité : savoir qu'un conseiller est en ligne compte plus que
/// l'état du service.
class VoxoChatHeader extends StatelessWidget {
  const VoxoChatHeader({
    required this.config,
    required this.connectivity,
    required this.handoff,
    required this.canRate,
    this.onRate,
    this.onNewConversation,
    this.onHistory,
    this.onClose,
    this.locale = 'fr',
    this.onLocaleChanged,
    super.key,
  });

  final VoxoChatbotConfig config;
  final VoxoConnectivity connectivity;
  final VoxoHandoff handoff;

  /// Une note ne se propose qu'après une vraie réponse de l'assistant.
  final bool canRate;

  final VoidCallback? onRate;
  final VoidCallback? onNewConversation;

  /// Ouvre la liste des conversations archivées (lecture seule).
  final VoidCallback? onHistory;
  final VoidCallback? onClose;
  final String locale;
  final ValueChanged<String>? onLocaleChanged;

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.surface,
        border: Border(bottom: BorderSide(color: theme.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
          child: Row(
            children: [
              _avatar(theme),
              const SizedBox(width: 10),
              Expanded(child: _titles(theme)),
              if (onLocaleChanged != null)
                Semantics(
                  label: VoxoI18n.text(locale, 'languageLabel'),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: locale,
                      items: const [
                        DropdownMenuItem(value: 'fr', child: Text('FR')),
                        DropdownMenuItem(value: 'en', child: Text('EN')),
                      ],
                      onChanged: (value) {
                        if (value != null) onLocaleChanged!(value);
                      },
                    ),
                  ),
                ),
              if (canRate && onRate != null)
                IconButton(
                  onPressed: onRate,
                  icon: const Icon(Icons.star_border, size: 21),
                  color: theme.textMuted,
                  tooltip: VoxoI18n.text(locale, 'endAndRateTooltip'),
                ),
              if (onHistory != null)
                IconButton(
                  onPressed: onHistory,
                  icon: const Icon(Icons.history, size: 22),
                  color: theme.textMuted,
                  tooltip: VoxoI18n.text(locale, 'historyTooltip'),
                ),
              if (onNewConversation != null)
                IconButton(
                  onPressed: onNewConversation,
                  icon: const Icon(Icons.edit_note, size: 22),
                  color: theme.textMuted,
                  tooltip: VoxoI18n.text(locale, 'newConversationTooltip'),
                ),
              if (onClose != null)
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close, size: 21),
                  color: theme.textMuted,
                  tooltip: VoxoI18n.text(locale, 'closeChatTooltip'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatar(VoxoTheme theme) {
    final avatarUrl = config.avatarUrl;
    return CircleAvatar(
      radius: 18,
      backgroundColor: theme.accent,
      foregroundImage: avatarUrl == null ? null : NetworkImage(avatarUrl),
      // Initiale du nom du chatbot : c'est le repli si l'avatar ne charge pas.
      child: Text(
        config.name.isEmpty ? 'A' : config.name.characters.first.toUpperCase(),
        style: TextStyle(
          color: theme.onAccent,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    );
  }

  Widget _titles(VoxoTheme theme) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        config.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: theme.text,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
      Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (handoff.labelFor(locale) == null) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: _statusColor(theme),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              _subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: theme.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    ],
  );

  String get _subtitle {
    final handoffLabel = handoff.labelFor(locale);
    if (handoffLabel != null) return handoffLabel;
    if (!config.features.connectivityStatus) {
      return VoxoI18n.text(locale, 'assistantOnlyStatus');
    }
    return switch (connectivity) {
      VoxoConnectivity.available => VoxoI18n.text(locale, 'assistantAvailable'),
      VoxoConnectivity.unavailable =>
        VoxoI18n.text(locale, 'serviceUnavailable'),
      VoxoConnectivity.connecting => VoxoI18n.text(locale, 'connectingStatus'),
    };
  }

  Color _statusColor(VoxoTheme theme) => switch (connectivity) {
    VoxoConnectivity.available => const Color(0xff16a34a),
    VoxoConnectivity.unavailable => theme.danger,
    VoxoConnectivity.connecting => const Color(0xfff59e0b),
  };
}
