import 'package:flutter/material.dart';

import '../../models/voxo_chatbot_config.dart';
import '../../models/voxo_message.dart';
import '../voxo_date_labels.dart';
import 'voxo_chat_decorations.dart';
import 'voxo_message_bubble.dart';

/// Fil de conversation : séparateurs de jour, bulles, réponses rapides et
/// indicateur de frappe.
///
/// Les réponses rapides ne s'affichent que sous le **dernier** message de
/// l'assistant : plus haut, elles inviteraient à répondre à une question déjà
/// dépassée.
class VoxoMessageList extends StatelessWidget {
  const VoxoMessageList({
    required this.messages,
    required this.features,
    required this.markdown,
    required this.isTyping,
    required this.agentName,
    required this.controller,
    this.locale = 'fr',
    this.onSuggestion,
    this.onFeedback,
    this.onRetry,
    this.onLinkTap,
    super.key,
  });

  final List<VoxoMessage> messages;
  final VoxoFeatures features;
  final bool markdown;
  final bool isTyping;
  final String? agentName;
  final ScrollController controller;
  final String locale;

  final void Function(String suggestion)? onSuggestion;
  final void Function(VoxoMessage message, VoxoFeedback value)? onFeedback;
  final void Function(String messageId)? onRetry;
  final void Function(String url)? onLinkTap;

  /// Index du dernier message de l'assistant porteur de suggestions.
  int get _suggestionAnchor {
    for (var i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].isFromUser && messages[i].suggestions.isNotEmpty) {
        return i;
      }
    }
    return -1;
  }

  @override
  Widget build(BuildContext context) {
    final anchor = _suggestionAnchor;

    return ListView.builder(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      // Une entrée de plus pour l'indicateur de frappe, en fin de liste.
      itemCount: messages.length + (isTyping ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= messages.length) {
          return VoxoTypingIndicator(locale: locale);
        }

        final message = messages[index];
        final previous = index == 0 ? null : messages[index - 1];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_needsSeparator(message, previous))
              VoxoDateSeparator(
                label: VoxoDateLabels.daySeparator(message.timestamp, locale: locale),
              ),
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: VoxoMessageBubble(
                message: message,
                features: features,
                markdown: markdown,
                agentName: agentName,
                locale: locale,
                onFeedback: onFeedback == null
                    ? null
                    : (value) => onFeedback!(message, value),
                onRetry: onRetry == null || !message.hasFailed
                    ? null
                    : () => onRetry!(message.id),
                onLinkTap: onLinkTap,
              ),
            ),
            if (index == anchor && onSuggestion != null)
              VoxoQuickReplies(
                suggestions: message.suggestions,
                onSelected: onSuggestion!,
              ),
          ],
        );
      },
    );
  }

  bool _needsSeparator(VoxoMessage message, VoxoMessage? previous) {
    if (!features.dateSeparators) return false;
    if (previous == null) return true;
    final current = message.timestamp.toLocal();
    final earlier = previous.timestamp.toLocal();
    return current.year != earlier.year ||
        current.month != earlier.month ||
        current.day != earlier.day;
  }
}
