import 'package:flutter/widgets.dart';

import '../models/voxo_chatbot_config.dart';
import 'voxo_color.dart';

/// Palette de l'écran de chat, dérivée de la configuration du tenant.
///
/// La couleur d'accent et le mode clair/sombre viennent de
/// `GET /widget/config` : c'est le propriétaire du chatbot qui décide, depuis
/// son dashboard. L'intégrateur peut passer outre en fournissant son propre
/// [VoxoTheme] à l'écran.
@immutable
class VoxoTheme {
  const VoxoTheme({
    required this.accent,
    required this.onAccent,
    required this.surface,
    required this.surfaceMuted,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.userBubble,
    required this.onUserBubble,
    required this.botBubble,
    required this.onBotBubble,
    required this.agentBubble,
    required this.danger,
    required this.brightness,
    this.radius = 16,
  });

  final Color accent;
  final Color onAccent;
  final Color surface;
  final Color surfaceMuted;
  final Color border;
  final Color text;
  final Color textMuted;
  final Color userBubble;
  final Color onUserBubble;
  final Color botBubble;
  final Color onBotBubble;

  /// Distingue visuellement un conseiller humain de l'assistant.
  final Color agentBubble;

  final Color danger;
  final Brightness brightness;
  final double radius;

  bool get isDark => brightness == Brightness.dark;

  /// Construit la palette pour [config].
  ///
  /// [platformBrightness] n'est utilisé que si le propriétaire n'a pas forcé un
  /// mode : sans consigne, on suit l'application hôte.
  factory VoxoTheme.fromConfig(
    VoxoChatbotConfig config, {
    Brightness platformBrightness = Brightness.light,
  }) {
    final accent = VoxoColor.parseOr(config.primaryColor, _defaultAccent);
    final brightness = switch (config.colorScheme) {
      'dark' => Brightness.dark,
      'light' => Brightness.light,
      _ => platformBrightness,
    };
    return brightness == Brightness.dark
        ? VoxoTheme._dark(accent, config)
        : VoxoTheme._light(accent, config);
  }

  factory VoxoTheme._light(Color accent, VoxoChatbotConfig config) => VoxoTheme(
        accent: accent,
        onAccent: VoxoColor.onColor(accent),
        surface: const Color(0xffffffff),
        surfaceMuted: const Color(0xfff3f4f6),
        border: const Color(0xffe5e7eb),
        text: VoxoColor.parseOr(config.textColor, const Color(0xff111827)),
        textMuted: const Color(0xff6b7280),
        userBubble: accent,
        onUserBubble: VoxoColor.onColor(accent),
        botBubble: const Color(0xfff3f4f6),
        onBotBubble: const Color(0xff111827),
        // Teinte d'accent très diluée : reconnaissable sans voler la vedette.
        agentBubble: VoxoColor.mix(accent, const Color(0xffffffff), 0.88),
        danger: const Color(0xffdc2626),
        brightness: Brightness.light,
      );

  factory VoxoTheme._dark(Color accent, VoxoChatbotConfig config) => VoxoTheme(
        accent: accent,
        onAccent: VoxoColor.onColor(accent),
        surface: const Color(0xff111827),
        surfaceMuted: const Color(0xff1f2937),
        border: const Color(0xff374151),
        text: const Color(0xfff9fafb),
        textMuted: const Color(0xff9ca3af),
        userBubble: accent,
        onUserBubble: VoxoColor.onColor(accent),
        botBubble: const Color(0xff1f2937),
        onBotBubble: const Color(0xfff9fafb),
        agentBubble: VoxoColor.mix(accent, const Color(0xff111827), 0.75),
        danger: const Color(0xfff87171),
        brightness: Brightness.dark,
      );

  static const Color _defaultAccent = Color(0xff3b82f6);
}

/// Rend le [VoxoTheme] disponible à tout l'arbre de l'écran de chat.
class VoxoThemeScope extends InheritedWidget {
  const VoxoThemeScope({
    required this.theme,
    required super.child,
    super.key,
  });

  final VoxoTheme theme;

  static VoxoTheme of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<VoxoThemeScope>();
    assert(scope != null, 'Aucun VoxoThemeScope au-dessus de ce widget.');
    return scope!.theme;
  }

  @override
  bool updateShouldNotify(VoxoThemeScope oldWidget) => theme != oldWidget.theme;
}
