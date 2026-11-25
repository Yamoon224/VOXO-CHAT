import 'package:flutter/gestures.dart';
import 'package:flutter/painting.dart';

import 'voxo_safe_url.dart';

/// Styles appliqués aux fragments enrichis d'un message.
class VoxoInlineStyles {
  const VoxoInlineStyles({
    required this.base,
    required this.code,
    required this.link,
  });

  final TextStyle base;
  final TextStyle code;
  final TextStyle link;
}

/// Analyse en ligne du sous-ensemble Markdown, portage de `appendInline` de
/// `widget/src/markdown.js`.
///
/// Le motif et l'ordre des alternatives sont volontairement identiques à ceux
/// du widget web : c'est ce qui garantit qu'une même réponse s'affiche de la
/// même façon sur les deux canaux.
abstract final class VoxoInlineParser {
  static final RegExp _pattern = RegExp(
    r'(`[^`\n]+`'
    r'|\*\*[^*\n]+\*\*'
    r'|__[^_\n]+__'
    r'|\*[^*\n]+\*'
    r'|_[^_\n]+_'
    r'|\[[^\]\n]+\]\([^\s)]+\)'
    r'|https?://[^\s<]+)',
    caseSensitive: false,
  );

  static final RegExp _linkPattern = RegExp(r'^\[([^\]]+)\]\(([^)]+)\)$');

  /// Découpe [value] en fragments stylés. [onLinkTap] reçoit une URL déjà
  /// filtrée par [VoxoSafeUrl] ; un lien non ouvrable retombe en texte simple.
  ///
  /// Les détecteurs de tap créés pour les liens sont déposés dans
  /// [recognizers] : ils tiennent des ressources et doivent être libérés par
  /// l'appelant quand le texte change ou disparaît.
  static List<InlineSpan> parse(
    String value,
    VoxoInlineStyles styles, {
    void Function(String url)? onLinkTap,
    List<GestureRecognizer>? recognizers,
  }) {
    final spans = <InlineSpan>[];
    var cursor = 0;

    for (final match in _pattern.allMatches(value)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: value.substring(cursor, match.start)));
      }
      cursor = match.end;
      spans.addAll(_token(match.group(0)!, styles, onLinkTap, recognizers));
    }

    if (cursor < value.length) {
      spans.add(TextSpan(text: value.substring(cursor)));
    }
    return spans;
  }

  static List<InlineSpan> _token(
    String token,
    VoxoInlineStyles styles,
    void Function(String url)? onLinkTap,
    List<GestureRecognizer>? recognizers,
  ) {
    if (token.startsWith('`')) {
      return [
        TextSpan(text: token.substring(1, token.length - 1), style: styles.code)
      ];
    }

    if (_wrappedBy(token, '**') || _wrappedBy(token, '__')) {
      return [
        TextSpan(
          style: const TextStyle(fontWeight: FontWeight.w700),
          children: parse(
            token.substring(2, token.length - 2),
            styles,
            onLinkTap: onLinkTap,
            recognizers: recognizers,
          ),
        )
      ];
    }

    if (_wrappedBy(token, '*') || _wrappedBy(token, '_')) {
      return [
        TextSpan(
          style: const TextStyle(fontStyle: FontStyle.italic),
          children: parse(
            token.substring(1, token.length - 1),
            styles,
            onLinkTap: onLinkTap,
            recognizers: recognizers,
          ),
        )
      ];
    }

    if (token.startsWith('[')) {
      final match = _linkPattern.firstMatch(token);
      if (match == null) return [TextSpan(text: token)];
      return [
        _link(match.group(1)!, match.group(2)!, styles, onLinkTap, recognizers)
      ];
    }

    // URL nue rencontrée au fil du texte : la ponctuation finale n'en fait
    // pas partie.
    final (url, trailing) = VoxoSafeUrl.splitTrailingPunctuation(token);
    return [
      _link(url, url, styles, onLinkTap, recognizers),
      if (trailing.isNotEmpty) TextSpan(text: trailing),
    ];
  }

  static InlineSpan _link(
    String label,
    String rawUrl,
    VoxoInlineStyles styles,
    void Function(String url)? onLinkTap,
    List<GestureRecognizer>? recognizers,
  ) {
    final href = VoxoSafeUrl.sanitize(rawUrl);
    // Un lien qu'on ne saurait pas ouvrir s'affiche en texte : mieux vaut un
    // libellé inerte qu'un lien mort.
    if (href == null || onLinkTap == null) {
      return TextSpan(text: label);
    }
    final recognizer = TapGestureRecognizer()..onTap = () => onLinkTap(href);
    recognizers?.add(recognizer);
    return TextSpan(text: label, style: styles.link, recognizer: recognizer);
  }

  static bool _wrappedBy(String token, String marker) =>
      token.length > marker.length * 2 &&
      token.startsWith(marker) &&
      token.endsWith(marker);
}
