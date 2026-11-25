import 'package:flutter/material.dart';

import '../core/voxo_controller.dart';
import '../theme/voxo_theme.dart';
import 'voxo_chat_view.dart';
import '../voxo_i18n.dart';

/// Bulle flottante qui ouvre le chat, équivalent mobile du lanceur du widget
/// web.
///
/// À poser dans un `Stack` par-dessus l'écran de l'application, ou à utiliser
/// comme `floatingActionButton` d'un `Scaffold`.
class VoxoLauncher extends StatelessWidget {
  const VoxoLauncher({
    required this.controller,
    this.theme,
    this.icon = Icons.chat_bubble_outline,
    super.key,
  });

  final VoxoController controller;
  final VoxoTheme? theme;
  final IconData icon;

  /// Ouvre le chat en plein écran, par-dessus la navigation courante.
  ///
  /// Le controller n'est pas disposé à la fermeture : la conversation continue
  /// en arrière-plan, et le socket reste branché pour recevoir la réponse d'un
  /// conseiller pendant que l'utilisateur fait autre chose.
  static Future<void> open(
    BuildContext context,
    VoxoController controller, {
    VoxoTheme? theme,
  }) =>
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (context) => VoxoChatView(
            controller: controller,
            theme: theme,
            onClose: () => Navigator.of(context).pop(),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: controller,
        builder: (context, _) {
          final resolved = theme ??
              VoxoTheme.fromConfig(
                controller.chatbot,
                platformBrightness: MediaQuery.platformBrightnessOf(context),
              );

          return FloatingActionButton(
            onPressed: () => open(context, controller, theme: theme),
            backgroundColor: resolved.accent,
            foregroundColor: resolved.onAccent,
            tooltip: VoxoI18n.text(controller.config.locale, 'openChat'),
            child: _icon(resolved),
          );
        },
      );

  Widget _icon(VoxoTheme resolved) {
    final url = controller.chatbot.launcherIconUrl;
    if (url == null) return Icon(icon);

    // Icône de marque définie par le propriétaire : elle peut ne pas charger
    // (réseau, URL périmée), auquel cas on retombe sur l'icône par défaut.
    return ClipOval(
      child: Image.network(
        url,
        width: 26,
        height: 26,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stack) => Icon(icon),
      ),
    );
  }
}
