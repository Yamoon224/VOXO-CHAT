import 'package:file_picker/file_picker.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/voxo_controller.dart';
import '../file_rules.dart';
import '../voxo_i18n.dart';
import 'markdown/voxo_safe_url.dart';

/// Actions de l'écran de chat qui passent par une capacité de l'appareil :
/// sélecteur de fichiers et ouverture de liens.
///
/// Isolées ici pour que les widgets restent purement visuels, et pour qu'une UI
/// maison puisse les réutiliser sans reprendre l'écran fourni.
abstract final class VoxoChatActions {
  /// Ouvre le sélecteur puis pousse les fichiers retenus dans la file du
  /// controller, qui se charge de compresser, valider et envoyer.
  ///
  /// Un refus de permission ou une annulation ne produit rien : ce n'est pas
  /// une erreur, l'utilisateur a simplement changé d'avis.
  static Future<void> pickFiles(VoxoController controller) async {
    final locale = controller.config.locale;
    final remaining = controller.attachments.remainingSlots;
    if (remaining <= 0) {
      controller.reportError(
        VoxoI18n.text(locale, 'maxAttachmentsError',
            {'count': controller.attachments.maxFiles}),
      );
      return;
    }

    try {
      final files = await FilePicker.pickFiles(
        dialogTitle: VoxoI18n.text(locale, 'attachFileTooltip'),
        type: FileType.custom,
        allowedExtensions: VoxoFileRules.allowedExtensions,
      );

      // Le sélecteur ignore parfois le filtre d'extensions : la validation
      // finale reste celle de la file, alignée sur shared/file-rules.mjs.
      final paths = files
          .map((file) => file.path)
          .whereType<String>()
          .take(remaining)
          .toList();
      if (paths.isEmpty) return;

      await controller.attachments.addAll(paths);
    } on PlatformException {
      controller.reportError(VoxoI18n.text(locale, 'filePickerUnavailable'));
    }
  }

  /// Ouvre [url] dans le navigateur ou l'application associée.
  ///
  /// L'URL a déjà traversé [VoxoSafeUrl] à l'analyse du message ; on la
  /// revalide ici parce que cette méthode est publique et peut être appelée
  /// depuis une UI maison.
  static Future<void> openLink(
    VoxoController controller,
    String url,
  ) async {
    final locale = controller.config.locale;
    final safe = VoxoSafeUrl.sanitize(url);
    final uri = safe == null ? null : Uri.tryParse(safe);
    if (uri == null) {
      controller.reportError(VoxoI18n.text(locale, 'linkOpenFailed'));
      return;
    }

    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication)
        .catchError((_) => false);
    if (!opened) {
      controller.reportError(VoxoI18n.text(locale, 'linkOpenFailed'));
    }
  }
}
