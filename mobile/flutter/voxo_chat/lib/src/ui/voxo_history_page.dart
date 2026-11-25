import 'package:flutter/material.dart';

import '../core/voxo_archived_view.dart';
import '../core/voxo_controller.dart';
import '../core/voxo_exception.dart';
import '../core/voxo_session_store.dart';
import '../theme/voxo_theme.dart';
import '../voxo_i18n.dart';
import 'voxo_chat_actions.dart';
import 'voxo_date_labels.dart';
import 'widgets/voxo_message_list.dart';

/// Historique des conversations archivées, en **lecture seule**.
///
/// Deux vues dans une même page : la liste, puis la transcription d'une
/// conversation (mêmes bulles que le chat, sans zone de saisie, sans avis ni
/// renvoi). La session active n'est jamais touchée ; tout passe par le
/// controller.
class VoxoHistoryPage extends StatefulWidget {
  const VoxoHistoryPage({
    required this.controller,
    required this.theme,
    super.key,
  });

  final VoxoController controller;
  final VoxoTheme theme;

  @override
  State<VoxoHistoryPage> createState() => _VoxoHistoryPageState();
}

class _VoxoHistoryPageState extends State<VoxoHistoryPage> {
  final ScrollController _scroll = ScrollController();
  late final Future<List<VoxoArchivedConversation>> _list =
      widget.controller.history();

  VoxoArchivedConversation? _open;
  Future<VoxoArchivedView>? _view;

  String get _locale => widget.controller.config.locale;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _openConversation(VoxoArchivedConversation item) => setState(() {
    _open = item;
    _view = widget.controller.archivedConversation(item.sessionId);
  });

  void _back() {
    if (_open == null) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _open = null;
      _view = null;
    });
  }

  @override
  Widget build(BuildContext context) => VoxoThemeScope(
    theme: widget.theme,
    child: PopScope(
      canPop: _open == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Material(
        color: widget.theme.surface,
        child: Column(
          children: [
            _header(),
            Expanded(child: _open == null ? _listView() : _transcript()),
          ],
        ),
      ),
    ),
  );

  Widget _header() {
    final theme = widget.theme;
    return Container(
      decoration: BoxDecoration(
        color: theme.surface,
        border: Border(bottom: BorderSide(color: theme.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 12, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: _back,
                icon: const Icon(Icons.arrow_back, size: 22),
                color: theme.textMuted,
                tooltip: VoxoI18n.text(_locale, 'backLabel'),
              ),
              Expanded(
                child: Text(
                  _open?.title ?? VoxoI18n.text(_locale, 'historyTitle'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _listView() => FutureBuilder<List<VoxoArchivedConversation>>(
    future: _list,
    builder: (context, snapshot) {
      if (snapshot.hasError) return _notice(_errorText(snapshot.error));
      final items = snapshot.data;
      if (items == null) return _spinner();
      if (items.isEmpty) return _notice(VoxoI18n.text(_locale, 'noHistory'));
      return ListView.separated(
        itemCount: items.length,
        separatorBuilder: (_, _) => Divider(height: 1, color: widget.theme.border),
        itemBuilder: (_, index) => _row(items[index]),
      );
    },
  );

  Widget _row(VoxoArchivedConversation item) => ListTile(
    onTap: () => _openConversation(item),
    title: Text(
      item.title,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(color: widget.theme.text, fontSize: 15),
    ),
    subtitle: Text(
      VoxoDateLabels.daySeparator(item.endedAt, locale: _locale),
      style: TextStyle(color: widget.theme.textMuted, fontSize: 12),
    ),
    trailing: Icon(Icons.chevron_right, color: widget.theme.textMuted),
  );

  Widget _transcript() => FutureBuilder<VoxoArchivedView>(
    future: _view,
    builder: (context, snapshot) {
      if (snapshot.hasError) return _notice(_errorText(snapshot.error));
      final view = snapshot.data;
      if (view == null) return _spinner();
      final chatbot = widget.controller.chatbot;
      return VoxoMessageList(
        messages: [...view.messages]
          ..sort((a, b) => a.timestamp.compareTo(b.timestamp)),
        features: chatbot.features,
        markdown: chatbot.enableMarkdown,
        isTyping: false,
        agentName: view.handoff.agentName,
        controller: _scroll,
        locale: _locale,
        onLinkTap: (url) => VoxoChatActions.openLink(widget.controller, url),
      );
    },
  );

  /// Message du SDK relayé tel quel ; repli générique pour tout le reste.
  String _errorText(Object? error) => error is VoxoException
      ? error.message
      : VoxoI18n.text(_locale, 'genericError');

  Widget _spinner() =>
      Center(child: CircularProgressIndicator(color: widget.theme.accent));

  Widget _notice(String text) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(color: widget.theme.textMuted, fontSize: 14),
      ),
    ),
  );
}
