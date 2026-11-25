import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/voxo_attachment_queue.dart';
import '../../core/voxo_limits.dart';
import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';
import 'voxo_pending_attachments.dart';

/// Zone de saisie : pièces jointes en attente, champ de texte, bouton d'envoi.
class VoxoComposerBar extends StatefulWidget {
  const VoxoComposerBar({
    required this.queue,
    required this.isSending,
    required this.attachmentsEnabled,
    required this.onSend,
    required this.onPickFiles,
    required this.onActivity,
    this.onTyping,
    this.locale = 'fr',
    super.key,
  });

  final VoxoAttachmentQueue queue;
  final bool isSending;

  /// Suit `options.features.attachments` de `GET /widget/config`.
  final bool attachmentsEnabled;

  final void Function(String text) onSend;
  final Future<void> Function() onPickFiles;
  final VoidCallback onActivity;

  /// Reçoit le texte à chaque modification du champ (aperçu de saisie).
  final ValueChanged<String>? onTyping;
  final String locale;

  @override
  State<VoxoComposerBar> createState() => _VoxoComposerBarState();
}

class _VoxoComposerBarState extends State<VoxoComposerBar> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  bool get _canSend =>
      !widget.isSending &&
      (_controller.text.trim().isNotEmpty || widget.queue.uploaded.isNotEmpty);

  void _send() {
    if (!_canSend) return;
    final text = _controller.text;
    _controller.clear();
    widget.onSend(text);
    // Le champ garde le focus : on enchaîne souvent plusieurs messages.
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.surface,
        border: Border(top: BorderSide(color: theme.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              VoxoPendingAttachments(queue: widget.queue, locale: widget.locale),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (widget.attachmentsEnabled) _attachButton(theme),
                  Expanded(child: _field(theme)),
                  const SizedBox(width: 4),
                  _sendButton(theme),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _attachButton(VoxoTheme theme) {
    // La file est pleine : le bouton reste visible mais inerte, pour que
    // l'utilisateur comprenne que la limite est atteinte.
    final isFull = widget.queue.remainingSlots <= 0;
    return IconButton(
      onPressed: isFull || widget.isSending ? null : widget.onPickFiles,
      icon: const Icon(Icons.attach_file, size: 21),
      color: theme.textMuted,
      tooltip: isFull
          ? VoxoI18n.text(widget.locale, 'attachLimitReached',
              {'count': widget.queue.maxFiles})
          : VoxoI18n.text(widget.locale, 'attachFileTooltip'),
    );
  }

  Widget _field(VoxoTheme theme) => TextField(
        controller: _controller,
        focusNode: _focusNode,
        maxLines: 4,
        minLines: 1,
        // Le backend refuse au-delà : autant l'empêcher à la frappe.
        maxLength: VoxoLimits.maxMessageLength,
        buildCounter: (_,
                {required currentLength, required isFocused, required maxLength}) =>
            null,
        textInputAction: TextInputAction.send,
        keyboardType: TextInputType.multiline,
        style: TextStyle(color: theme.text, fontSize: 15),
        inputFormatters: [
          LengthLimitingTextInputFormatter(VoxoLimits.maxMessageLength),
        ],
        onChanged: (text) {
          widget.onActivity();
          widget.onTyping?.call(text);
          setState(() {});
        },
        onSubmitted: (_) => _send(),
        decoration: InputDecoration(
          hintText: VoxoI18n.text(widget.locale, 'composerHint'),
          hintStyle: TextStyle(color: theme.textMuted, fontSize: 15),
          filled: true,
          fillColor: theme.surfaceMuted,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(22),
            borderSide: BorderSide.none,
          ),
        ),
      );

  Widget _sendButton(VoxoTheme theme) => Semantics(
        button: true,
        label: VoxoI18n.text(widget.locale, 'sendMessageLabel'),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Material(
            color: _canSend ? theme.accent : theme.surfaceMuted,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _canSend ? _send : null,
              child: widget.isSending
                  ? Padding(
                      padding: const EdgeInsets.all(13),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: theme.textMuted,
                      ),
                    )
                  : Icon(
                      Icons.arrow_upward,
                      size: 20,
                      color: _canSend ? theme.onAccent : theme.textMuted,
                    ),
            ),
          ),
        ),
      );
}
