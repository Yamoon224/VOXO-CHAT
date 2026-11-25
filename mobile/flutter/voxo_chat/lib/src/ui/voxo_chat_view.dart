import 'package:flutter/material.dart';

import '../core/voxo_controller.dart';
import '../theme/voxo_theme.dart';
import '../voxo_i18n.dart';
import 'voxo_chat_actions.dart';
import 'voxo_history_page.dart';
import 'widgets/voxo_chat_header.dart';
import 'widgets/voxo_composer_bar.dart';
import 'widgets/voxo_message_list.dart';
import 'widgets/voxo_rating_sheet.dart';

/// Écran de chat prêt à l'emploi.
///
/// Il se contente de refléter [VoxoController] : toute la logique vit dans le
/// core. Une application qui veut sa propre interface peut ignorer cet écran et
/// s'abonner directement au controller.
///
/// L'appelant reste propriétaire du controller — le disposer ici casserait un
/// controller partagé entre plusieurs écrans.
class VoxoChatView extends StatefulWidget {
  const VoxoChatView({
    required this.controller,
    this.theme,
    this.onClose,
    super.key,
  });

  final VoxoController controller;

  /// Palette imposée par l'intégrateur. Par défaut, celle du tenant, telle que
  /// `GET /widget/config` l'annonce.
  final VoxoTheme? theme;

  /// Affiche un bouton de fermeture quand l'écran est présenté en modale.
  final VoidCallback? onClose;

  @override
  State<VoxoChatView> createState() => _VoxoChatViewState();
}

class _VoxoChatViewState extends State<VoxoChatView> {
  final ScrollController _scroll = ScrollController();
  int _lastMessageCount = 0;

  VoxoController get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller
      ..addListener(_onControllerChanged)
      ..setOpen(true);
    // `init` est idempotent : un second écran monté sur le même controller ne
    // relance pas la séquence de démarrage.
    _controller.init();
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onControllerChanged)
      ..setOpen(false);
    _scroll.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    _drainError();
    final count = _controller.messages.length;
    if (count != _lastMessageCount) {
      _lastMessageCount = count;
      _scrollToBottom();
    }
  }

  /// Le message d'erreur est consommé : il ne doit apparaître qu'une fois, même
  /// si d'autres changements d'état surviennent ensuite.
  void _drainError() {
    final error = _controller.lastError;
    if (error == null || !mounted) return;
    _controller.clearError();
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(content: Text(error), behavior: SnackBarBehavior.floating),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _rate(VoxoTheme theme) async {
    final result = await VoxoRatingSheet.show(
      context,
      theme,
      locale: _controller.config.locale,
    );
    if (result == null || !mounted) return;

    final closed = await _controller.endConversation(
      rating: result.rating,
      feedback: result.comment,
    );
    if (!closed || !mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(VoxoI18n.text(_controller.config.locale, 'ratingThanks')),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _openHistory(VoxoTheme theme) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => VoxoHistoryPage(controller: _controller, theme: theme),
    ),
  );

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _controller,
    builder: (context, _) {
      final theme =
          widget.theme ??
          VoxoTheme.fromConfig(
            _controller.chatbot,
            platformBrightness: MediaQuery.platformBrightnessOf(context),
          );

      return VoxoThemeScope(
        theme: theme,
        child: Material(
          color: theme.surface,
          child: Column(
            children: [
              VoxoChatHeader(
                config: _controller.chatbot,
                connectivity: _controller.connectivity,
                handoff: _controller.handoff,
                canRate: _controller.canRate,
                onRate: () => _rate(theme),
                onNewConversation: _controller.startNewSession,
                onHistory: () => _openHistory(theme),
                onClose: widget.onClose,
                locale: _controller.config.locale,
                onLocaleChanged: _controller.config.options.showLanguageSwitcher
                    ? _controller.setLocale
                    : null,
              ),
              Expanded(child: _body(theme)),
              VoxoComposerBar(
                queue: _controller.attachments,
                isSending: _controller.isLoading,
                attachmentsEnabled: _controller.chatbot.features.attachments,
                onSend: _controller.sendMessage,
                onPickFiles: () => VoxoChatActions.pickFiles(_controller),
                onActivity: _controller.notifyUserActivity,
                onTyping: _controller.notifyTyping,
                locale: _controller.config.locale,
              ),
            ],
          ),
        ),
      );
    },
  );

  Widget _body(VoxoTheme theme) {
    // Tant que la configuration distante n'est pas arrivée, afficher un fil
    // vide ferait clignoter le thème par défaut puis celui du tenant.
    if (!_controller.isReady && _controller.messages.isEmpty) {
      return Center(child: CircularProgressIndicator(color: theme.accent));
    }

    return VoxoMessageList(
      messages: _controller.messages,
      features: _controller.chatbot.features,
      markdown: _controller.chatbot.enableMarkdown,
      isTyping:
          _controller.isLoading && _controller.config.options.enableTyping,
      agentName: _controller.handoff.agentName,
      controller: _scroll,
      locale: _controller.config.locale,
      onSuggestion: _controller.sendMessage,
      onFeedback: _controller.submitFeedback,
      onRetry: _controller.retry,
      onLinkTap: (url) => VoxoChatActions.openLink(_controller, url),
    );
  }
}
