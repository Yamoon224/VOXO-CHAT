/// Filtrage des URL, portage de `safeUrl` de `widget/src/markdown.js`.
///
/// Une réponse d'assistant est du texte produit par un modèle : elle peut
/// contenir n'importe quel lien. On n'ouvre que des schémas inoffensifs, ce qui
/// écarte notamment `javascript:` et `data:`.
abstract final class VoxoSafeUrl {
  static const Set<String> _allowedSchemes = {'http', 'https', 'mailto', 'tel'};

  /// Caractères de contrôle : ils servent à masquer un schéma interdit en le
  /// coupant en deux, ce que l'analyse d'URI laisserait passer.
  static final RegExp _controlCharacters =
      RegExp('[\u0000-\u001f\u007f]');

  /// Renvoie l'URL si elle est ouvrable, `null` sinon.
  static String? sanitize(String? value) {
    final input = value?.trim() ?? '';
    if (input.isEmpty || _controlCharacters.hasMatch(input)) return null;

    // Le widget web accepte un chemin absolu, relatif au site qui l'héberge.
    // Une application mobile n'a pas de site de rattachement : il n'y a rien à
    // ouvrir, donc on refuse.
    if (input.startsWith('/')) return null;

    final uri = Uri.tryParse(input);
    if (uri == null || !uri.hasScheme) return null;
    return _allowedSchemes.contains(uri.scheme.toLowerCase()) ? input : null;
  }

  /// Sépare la ponctuation finale d'une URL détectée au fil du texte : dans
  /// « voir https://voxo.chat. », le point n'appartient pas au lien.
  static (String url, String trailing) splitTrailingPunctuation(String value) {
    final match = RegExp(r'[),.!?;:]+$').firstMatch(value);
    final trailing = match?.group(0) ?? '';
    return trailing.isEmpty
        ? (value, '')
        : (value.substring(0, value.length - trailing.length), trailing);
  }
}
