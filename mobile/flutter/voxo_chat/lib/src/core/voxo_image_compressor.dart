import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';

import '../file_rules.dart';

/// Réduction d'une image avant envoi, parité avec `compressImage` de
/// `shared/file-rules.mjs` : au plus 2 048 px sur le plus grand côté, ré-encodée
/// en WebP qualité 0,82.
///
/// Le fichier d'origine est conservé si la compression ne fait rien gagner, si
/// le format ne s'y prête pas, ou en cas d'échec — la validation de taille
/// s'applique ensuite au résultat, quel qu'il soit.
abstract final class VoxoImageCompressor {
  static const int _maxDimension = 2048;
  static const int _quality = 82;

  /// Formats recompressables. Le GIF est écarté : il peut être animé, et la
  /// recompression l'aplatirait sur sa première image.
  static const Set<String> _compressible = {'.jpg', '.jpeg', '.png', '.webp'};

  /// Renvoie le chemin du fichier à envoyer — le compressé, ou l'original.
  static Future<String> compress(String path) async {
    final extension = VoxoFileRules.extensionOf(path);
    if (!_compressible.contains(extension)) return path;

    try {
      final source = File(path);
      final originalSize = await source.length();
      final directory = await getTemporaryDirectory();
      final target =
          '${directory.path}/voxo-${DateTime.now().microsecondsSinceEpoch}.webp';

      final result = await FlutterImageCompress.compressAndGetFile(
        path,
        target,
        format: CompressFormat.webp,
        quality: _quality,
        minWidth: _maxDimension,
        minHeight: _maxDimension,
      );

      if (result == null) return path;

      // Recompresser peut alourdir un PNG déjà optimisé : on garde le plus léger.
      if (await result.length() >= originalSize) {
        await File(result.path).delete().catchError((_) => File(result.path));
        return path;
      }
      return result.path;
    } catch (_) {
      return path;
    }
  }
}
