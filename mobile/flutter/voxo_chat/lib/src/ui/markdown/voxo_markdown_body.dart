import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../../theme/voxo_theme.dart';
import 'voxo_block_parser.dart';
import 'voxo_inline_parser.dart';
import 'voxo_safe_url.dart';

/// Affiche le contenu d'un message.
///
/// En Markdown, seul le sous-ensemble du widget web est reconnu — gras,
/// italique, code, liens, listes, blocs de code — pour que la même réponse
/// s'affiche pareil sur le web et sur mobile. En mode texte, seules les URL
/// sont rendues cliquables.
class VoxoMarkdownBody extends StatefulWidget {
  const VoxoMarkdownBody({
    required this.text,
    required this.color,
    required this.markdown,
    this.onLinkTap,
    super.key,
  });

  final String text;
  final Color color;

  /// Suit `options.enableMarkdown` de `GET /widget/config`.
  final bool markdown;

  /// Reçoit une URL déjà filtrée par [VoxoSafeUrl].
  final void Function(String url)? onLinkTap;

  @override
  State<VoxoMarkdownBody> createState() => _VoxoMarkdownBodyState();
}

class _VoxoMarkdownBodyState extends State<VoxoMarkdownBody> {
  /// Les détecteurs de tap survivent au build : il faut les libérer nous-mêmes
  /// dès que le texte change ou que le widget disparaît.
  final List<GestureRecognizer> _recognizers = [];

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  void _disposeRecognizers() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);
    _disposeRecognizers();

    final styles = VoxoInlineStyles(
      base: TextStyle(color: widget.color, fontSize: 15, height: 1.45),
      code: TextStyle(
        color: widget.color,
        fontSize: 14,
        fontFamily: 'monospace',
        backgroundColor: theme.surfaceMuted,
      ),
      link: TextStyle(
        color: theme.isDark ? theme.text : theme.accent,
        decoration: TextDecoration.underline,
        decorationColor: theme.accent,
      ),
    );

    if (!widget.markdown) {
      return Text.rich(
        TextSpan(children: _plainText(styles)),
        style: styles.base,
      );
    }

    final blocks = VoxoBlockParser.parse(widget.text);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < blocks.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          _block(blocks[i], styles, theme),
        ],
      ],
    );
  }

  /// Sans Markdown, seules les URL sont enrichies : c'est ce que fait
  /// `renderPlainText` côté web.
  List<InlineSpan> _plainText(VoxoInlineStyles styles) => VoxoInlineParser.parse(
        widget.text,
        styles,
        onLinkTap: widget.onLinkTap,
        recognizers: _recognizers,
      );

  Widget _block(VoxoBlock block, VoxoInlineStyles styles, VoxoTheme theme) {
    if (block.isCode) {
      return _CodeBlock(
        content: block.lines.join('\n'),
        style: styles.code.copyWith(backgroundColor: null),
        theme: theme,
      );
    }
    if (block.isList) return _list(block, styles);

    return Text.rich(
      TextSpan(children: _inline(block.lines.join('\n'), styles)),
      style: styles.base,
    );
  }

  Widget _list(VoxoBlock block, VoxoInlineStyles styles) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < block.lines.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 22,
                    child: Text(
                      block.isOrdered ? '${i + 1}.' : '•',
                      style: styles.base,
                    ),
                  ),
                  Expanded(
                    child: Text.rich(
                      TextSpan(children: _inline(block.lines[i], styles)),
                      style: styles.base,
                    ),
                  ),
                ],
              ),
            ),
        ],
      );

  List<InlineSpan> _inline(String value, VoxoInlineStyles styles) =>
      VoxoInlineParser.parse(
        value,
        styles,
        onLinkTap: widget.onLinkTap,
        recognizers: _recognizers,
      );
}

/// Bloc de code : police à chasse fixe, défilement horizontal plutôt que
/// retour à la ligne, qui casserait l'indentation.
class _CodeBlock extends StatelessWidget {
  const _CodeBlock({
    required this.content,
    required this.style,
    required this.theme,
  });

  final String content;
  final TextStyle style;
  final VoxoTheme theme;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: theme.surfaceMuted,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: theme.border),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Text(content, style: style),
        ),
      );
}
