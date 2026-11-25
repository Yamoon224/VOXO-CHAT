import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/src/core/voxo_uuid.dart';

/// Regex recopiée depuis `backend/src/validators/widgetMessageValidator.js`.
/// Un `clientMessageId` qui ne la satisfait pas est rejeté en 400 : ce test
/// garde le générateur aligné sur ce que le serveur accepte réellement.
final backendUuidV4 = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);

void main() {
  group('VoxoUuid.v4', () {
    test('produit un UUID accepté par le validateur backend', () {
      for (var i = 0; i < 500; i++) {
        expect(backendUuidV4.hasMatch(VoxoUuid.v4()), isTrue);
      }
    });

    test('pose bien les bits de version et de variante', () {
      final uuid = VoxoUuid.v4();
      expect(uuid[14], '4');
      expect(['8', '9', 'a', 'b'], contains(uuid[19]));
    });

    test('ne produit pas deux fois le même identifiant', () {
      final generated = List.generate(2000, (_) => VoxoUuid.v4()).toSet();
      expect(generated, hasLength(2000));
    });
  });

  group('VoxoUuid.isValid', () {
    test('accepte un UUID v4 valide', () {
      expect(VoxoUuid.isValid('9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d'), isTrue);
    });

    test('refuse un UUID v1 : le backend le rejetterait aussi', () {
      expect(VoxoUuid.isValid('9f8b7c6d-1e2f-1a3b-8c9d-0e1f2a3b4c5d'), isFalse);
    });

    test('refuse une variante hors RFC 4122', () {
      expect(VoxoUuid.isValid('9f8b7c6d-1e2f-4a3b-1c9d-0e1f2a3b4c5d'), isFalse);
    });

    test('refuse null, une chaîne vide et du texte libre', () {
      expect(VoxoUuid.isValid(null), isFalse);
      expect(VoxoUuid.isValid(''), isFalse);
      expect(VoxoUuid.isValid('widget-session-1'), isFalse);
    });
  });
}
