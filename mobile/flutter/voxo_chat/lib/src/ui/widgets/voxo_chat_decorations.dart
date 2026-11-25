import 'package:flutter/material.dart';

import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';

/// Séparateur de jour dans le fil : « Aujourd'hui », « Hier », ou la date.
class VoxoDateSeparator extends StatelessWidget {
  const VoxoDateSeparator({required this.label, super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(child: Divider(color: theme.border, height: 1)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              label,
              style: TextStyle(color: theme.textMuted, fontSize: 11),
            ),
          ),
          Expanded(child: Divider(color: theme.border, height: 1)),
        ],
      ),
    );
  }
}

/// Trois points animés pendant que l'assistant prépare sa réponse.
class VoxoTypingIndicator extends StatefulWidget {
  const VoxoTypingIndicator({this.locale = 'fr', super.key});

  final String locale;

  @override
  State<VoxoTypingIndicator> createState() => _VoxoTypingIndicatorState();
}

class _VoxoTypingIndicatorState extends State<VoxoTypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: Semantics(
        label: VoxoI18n.text(widget.locale, 'typingLabel'),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: theme.botBubble,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(theme.radius),
              topRight: Radius.circular(theme.radius),
              bottomRight: Radius.circular(theme.radius),
              bottomLeft: const Radius.circular(4),
            ),
          ),
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < 3; i++) _dot(i, theme),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Chaque point est décalé d'un tiers de cycle : c'est ce décalage qui donne
  /// l'impression d'une vague plutôt que d'un clignotement.
  Widget _dot(int index, VoxoTheme theme) {
    final phase = (_controller.value + index / 3) % 1;
    final opacity = 0.35 + 0.65 * (1 - (phase * 2 - 1).abs());
    return Padding(
      padding: EdgeInsets.only(right: index == 2 ? 0 : 4),
      child: Container(
        width: 7,
        height: 7,
        decoration: BoxDecoration(
          color: theme.textMuted.withValues(alpha: opacity),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

/// Réponses rapides proposées sous un message de l'assistant.
class VoxoQuickReplies extends StatelessWidget {
  const VoxoQuickReplies({
    required this.suggestions,
    required this.onSelected,
    super.key,
  });

  final List<String> suggestions;
  final void Function(String suggestion) onSelected;

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return const SizedBox.shrink();
    final theme = VoxoThemeScope.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 2),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final suggestion in suggestions)
            ActionChip(
              label: Text(suggestion),
              onPressed: () => onSelected(suggestion),
              backgroundColor: theme.surface,
              labelStyle: TextStyle(color: theme.accent, fontSize: 13),
              side: BorderSide(color: theme.accent.withValues(alpha: 0.45)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
        ],
      ),
    );
  }
}
