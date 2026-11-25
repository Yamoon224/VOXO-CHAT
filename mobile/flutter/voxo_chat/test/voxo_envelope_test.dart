import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/src/core/voxo_envelope.dart';
import 'package:voxo_chat/voxo_chat.dart';

void main() {
  group('VoxoEnvelope.unwrap', () {
    test('renvoie data sur une enveloppe de succès', () {
      final data = VoxoEnvelope.unwrap(
        200,
        '{"success":true,"data":{"sessionId":"abc"},"message":"ok"}',
      );
      expect(data['sessionId'], 'abc');
    });

    test('renvoie une map vide quand data est absent', () {
      expect(VoxoEnvelope.unwrap(200, '{"success":true}'), isEmpty);
    });

    test('relaie le message français du serveur sans le réécrire', () {
      expect(
        () => VoxoEnvelope.unwrap(
          400,
          '{"success":false,"error":"Message trop long (max 2000 caractères)",'
          '"code":"MESSAGE_TOO_LONG"}',
        ),
        throwsA(
          isA<VoxoException>()
              .having((e) => e.message, 'message',
                  'Message trop long (max 2000 caractères)')
              .having((e) => e.code, 'code', 'MESSAGE_TOO_LONG')
              .having((e) => e.statusCode, 'statusCode', 400),
        ),
      );
    });

    test('expose isNotFound sur un 404, cas normal d’une session neuve', () {
      expect(
        () => VoxoEnvelope.unwrap(
          404,
          '{"success":false,"error":"Conversation not found"}',
        ),
        throwsA(isA<VoxoException>().having((e) => e.isNotFound, 'isNotFound', true)),
      );
    });

    test('expose isRateLimited sur un 429', () {
      expect(
        () => VoxoEnvelope.unwrap(
          429,
          '{"success":false,"error":"Trop de messages envoyés.",'
          '"code":"RATE_LIMIT_EXCEEDED"}',
        ),
        throwsA(
          isA<VoxoException>().having((e) => e.isRateLimited, 'isRateLimited', true),
        ),
      );
    });

    test('un corps illisible sur un échec ne masque pas l’échec', () {
      expect(
        () => VoxoEnvelope.unwrap(502, '<html>Bad Gateway</html>'),
        throwsA(
          isA<VoxoException>()
              .having((e) => e.statusCode, 'statusCode', 502)
              .having((e) => e.message, 'message', contains('indisponible')),
        ),
      );
    });

    test('un corps illisible sur un succès est une réponse malformée', () {
      expect(
        () => VoxoEnvelope.unwrap(200, 'pas du json'),
        throwsA(
          isA<VoxoException>()
              .having((e) => e.code, 'code', 'MALFORMED_RESPONSE'),
        ),
      );
    });
  });
}
