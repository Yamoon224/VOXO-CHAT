import 'dart:ui';

/// Lecture des couleurs annoncées par `GET /widget/config`.
///
/// Le dashboard stocke des chaînes libres : on accepte les formes courantes et
/// on retombe sur la couleur par défaut plutôt que de planter l'écran de chat
/// pour une valeur mal saisie.
abstract final class VoxoColor {
  /// Accepte `#rgb`, `#rrggbb`, `#aarrggbb`, avec ou sans `#`.
  static Color? parse(String? value) {
    final input = value?.trim().replaceFirst('#', '') ?? '';
    final normalized = switch (input.length) {
      3 => 'ff${input.split('').map((c) => '$c$c').join()}',
      6 => 'ff$input',
      8 => input,
      _ => null,
    };
    if (normalized == null) return null;
    final parsed = int.tryParse(normalized, radix: 16);
    return parsed == null ? null : Color(parsed);
  }

  static Color parseOr(String? value, Color fallback) =>
      parse(value) ?? fallback;

  /// Noir ou blanc, selon ce qui reste lisible sur [background].
  ///
  /// Seuil de luminance relative de 0,5 : la couleur d'accent est choisie par
  /// le client, elle peut être très claire comme très foncée.
  static Color onColor(Color background) =>
      background.computeLuminance() > 0.5
          ? const Color(0xff111827)
          : const Color(0xffffffff);

  /// Mélange [color] vers [towards] à hauteur de [amount] (0 à 1).
  static Color mix(Color color, Color towards, double amount) =>
      Color.lerp(color, towards, amount.clamp(0, 1))!;
}
