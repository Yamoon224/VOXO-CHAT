import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/voxo_chat.dart';

/// Ces attentes doivent rester alignées sur `shared/file-rules.mjs` : les
/// messages sont ceux que le widget web affiche déjà.
void main() {
  group('VoxoFileRules.categoryOf', () {
    test('classe les images', () {
      expect(VoxoFileRules.categoryOf('photo.PNG'),
          VoxoAttachmentCategory.image);
      expect(VoxoFileRules.categoryOf('scan.tiff'),
          VoxoAttachmentCategory.image);
    });

    test('classe les documents', () {
      expect(VoxoFileRules.categoryOf('contrat.pdf'),
          VoxoAttachmentCategory.document);
      expect(VoxoFileRules.categoryOf('notes.md'),
          VoxoAttachmentCategory.document);
    });

    test('refuse un format non pris en charge', () {
      expect(VoxoFileRules.categoryOf('archive.zip'), isNull);
      expect(VoxoFileRules.categoryOf('sans-extension'), isNull);
    });
  });

  group('VoxoFileRules.validate', () {
    test('accepte un fichier conforme', () {
      final result = VoxoFileRules.validate('photo.jpg', 500 * 1024);
      expect(result.isValid, isTrue);
      expect(result.category, VoxoAttachmentCategory.image);
      expect(result.error, isNull);
    });

    test('refuse un fichier vide', () {
      final result = VoxoFileRules.validate('photo.jpg', 0);
      expect(result.isValid, isFalse);
      expect(result.error, 'Le fichier est vide.');
    });

    test('refuse un format non pris en charge en listant les formats acceptés',
        () {
      final result = VoxoFileRules.validate('archive.zip', 1024);
      expect(result.isValid, isFalse);
      expect(result.error, startsWith('Format non pris en charge'));
      expect(result.error, contains('.pdf'));
      expect(result.error, contains('.png'));
    });

    test('refuse un fichier trop lourd avec les deux tailles en français', () {
      final result = VoxoFileRules.validate('gros.pdf', 12 * 1024 * 1024);
      expect(result.isValid, isFalse);
      expect(result.error, contains('12,0 Mo'));
      expect(result.error, contains('10,0 Mo'));
    });

    test('applique la limite annoncée par le serveur plutôt que la locale', () {
      final result = VoxoFileRules.validate(
        'moyen.pdf',
        3 * 1024 * 1024,
        maxBytes: 2 * 1024 * 1024,
      );
      expect(result.isValid, isFalse);
      expect(result.error, contains('2,0 Mo'));
    });
  });

  group('VoxoFileRules.formatSize', () {
    test('formate en Mo avec une virgule décimale', () {
      expect(VoxoFileRules.formatSize(1536 * 1024), '1,5 Mo');
    });

    test('formate en Ko en dessous du mégaoctet', () {
      expect(VoxoFileRules.formatSize(320 * 1024), '320 Ko');
    });

    test('n’affiche jamais 0 Ko pour un fichier non vide', () {
      expect(VoxoFileRules.formatSize(12), '1 Ko');
    });
  });

  test('les limites sont bien celles du backend', () {
    expect(VoxoFileRules.maxFileBytes, 10 * 1024 * 1024);
    expect(VoxoFileRules.maxAttachmentsPerMessage, 3);
    expect(VoxoLimits.maxMessageLength, 2000);
    expect(VoxoLimits.messagesPerMinute, 15);
  });
}
