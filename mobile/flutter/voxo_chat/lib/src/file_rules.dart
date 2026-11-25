import 'models/voxo_attachment.dart';
import 'voxo_i18n.dart';

/// Miroir Dart de `shared/file-rules.mjs`, lui-même miroir de
/// `backend/src/config/fileUploads.js`.
///
/// **Toute modification doit être reportée des trois côtés** : les extensions
/// acceptées et les messages d'erreur sont ceux que le widget web affiche déjà,
/// pour que l'expérience soit identique quel que soit le canal.
abstract final class VoxoFileRules {
  static const int maxFileBytes = 10 * 1024 * 1024;
  static const int maxAttachmentsPerMessage = 3;

  /// Extension -> type MIME canonique. L'extension fait autorité : les
  /// sélecteurs de fichiers annoncent souvent un type vide pour `.md` et `.csv`.
  static const Map<String, String> documentExtensions = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };

  static const Map<String, String> imageExtensions = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
  };

  /// Une conversation accepte documents et images.
  static Map<String, String> get conversationExtensions => {
        ...documentExtensions,
        ...imageExtensions,
      };

  /// Extensions sans le point, pour `FilePicker.custom`.
  static List<String> get allowedExtensions => conversationExtensions.keys
      .map((extension) => extension.substring(1))
      .toList();

  static String extensionOf(String filename) {
    final match = RegExp(r'\.[^.]+$').firstMatch(filename.toLowerCase());
    return match?.group(0) ?? '';
  }

  static VoxoAttachmentCategory? categoryOf(String filename) {
    final extension = extensionOf(filename);
    if (imageExtensions.containsKey(extension)) {
      return VoxoAttachmentCategory.image;
    }
    if (documentExtensions.containsKey(extension)) {
      return VoxoAttachmentCategory.document;
    }
    return null;
  }

  static String? mimeTypeOf(String filename) =>
      conversationExtensions[extensionOf(filename)];

  /// Formate une taille comme le widget web : « 1,5 Mo » ou « 320 Ko »
  /// (« 1.5 MB » / « 320 KB » en anglais).
  static String formatSize(int bytes, {String locale = 'fr'}) {
    final isEn = VoxoI18n.normalize(locale) == 'en';
    if (bytes >= 1024 * 1024) {
      final megabytes = (bytes / (1024 * 1024)).toStringAsFixed(1);
      final unit = isEn ? 'MB' : 'Mo';
      return isEn ? '$megabytes $unit' : '${megabytes.replaceAll('.', ',')} $unit';
    }
    final kilobytes = (bytes / 1024).round();
    final unit = isEn ? 'KB' : 'Ko';
    return '${kilobytes < 1 ? 1 : kilobytes} $unit';
  }

  /// Valide un fichier **déjà compressé** : la limite porte sur l'envoi réel.
  ///
  /// [maxBytes] permet d'appliquer la limite annoncée par `GET /widget/config`
  /// plutôt que la constante locale. [locale] détermine la langue du message
  /// d'erreur éventuel.
  static VoxoFileValidation validate(
    String filename,
    int sizeBytes, {
    int maxBytes = maxFileBytes,
    String locale = 'fr',
  }) {
    if (sizeBytes <= 0) {
      return VoxoFileValidation.invalid(VoxoI18n.text(locale, 'fileEmpty'));
    }

    final category = categoryOf(filename);
    if (category == null) {
      final list = conversationExtensions.keys.join(', ');
      return VoxoFileValidation.invalid(
        VoxoI18n.text(locale, 'unsupportedFormat', {'list': list}),
      );
    }

    if (sizeBytes > maxBytes) {
      return VoxoFileValidation.invalid(
        VoxoI18n.text(locale, 'fileTooLarge', {
          'size': formatSize(sizeBytes, locale: locale),
          'max': formatSize(maxBytes, locale: locale),
        }),
      );
    }

    return VoxoFileValidation.valid(category);
  }
}

/// Résultat de validation. [error] est en français, affichable tel quel.
class VoxoFileValidation {
  const VoxoFileValidation.valid(this.category)
      : isValid = true,
        error = null;

  const VoxoFileValidation.invalid(this.error)
      : isValid = false,
        category = null;

  final bool isValid;
  final String? error;
  final VoxoAttachmentCategory? category;
}
