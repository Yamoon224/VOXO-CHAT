import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/voxo_chat.dart';

const tenantId = '9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d';

void main() {
  group('normalisation de apiUrl', () {
    test('retire la barre oblique finale', () {
      final config =
          VoxoConfig(apiUrl: 'https://api.voxo.chat/api/', tenantId: tenantId);
      expect(config.apiUrl, 'https://api.voxo.chat/api');
    });

    test('retire la query et le fragment', () {
      final config = VoxoConfig(
        apiUrl: 'https://api.voxo.chat/api?debug=1#x',
        tenantId: tenantId,
      );
      expect(config.apiUrl, 'https://api.voxo.chat/api');
    });

    test('accepte http pour le développement local', () {
      final config =
          VoxoConfig(apiUrl: 'http://10.0.2.2:5000/api', tenantId: tenantId);
      expect(config.apiUrl, 'http://10.0.2.2:5000/api');
    });

    test('refuse une URL sans schéma, vide ou non HTTP', () {
      for (final value in ['', 'api.voxo.chat/api', 'ftp://voxo.chat/api']) {
        expect(
          () => VoxoConfig(apiUrl: value, tenantId: tenantId),
          throwsA(isA<VoxoException>()
              .having((e) => e.code, 'code', 'INVALID_CONFIG')),
          reason: value,
        );
      }
    });
  });

  group('validation du tenantId', () {
    test('refuse un tenantId qui n’est pas un UUID v4', () {
      expect(
        () => VoxoConfig(apiUrl: 'https://a.b/api', tenantId: 'mon-tenant'),
        throwsA(isA<VoxoException>()
            .having((e) => e.code, 'code', 'INVALID_CONFIG')),
      );
    });
  });

  group('conversationSocketUri', () {
    test('bascule https vers wss et conserve le préfixe /api', () {
      final config =
          VoxoConfig(apiUrl: 'https://api.voxo.chat/api', tenantId: tenantId);
      final uri = config.conversationSocketUri('session-1');
      expect(uri.scheme, 'wss');
      expect(uri.path, '/api/widget/conversation/session-1/socket');
      // L'autorisation du socket passe par la query, pas par un header.
      expect(uri.queryParameters['tenantId'], tenantId);
    });

    test('bascule http vers ws', () {
      final config =
          VoxoConfig(apiUrl: 'http://10.0.2.2:5000/api', tenantId: tenantId);
      expect(config.conversationSocketUri('s').scheme, 'ws');
    });

    test('encode un sessionId contenant des caractères réservés', () {
      final config =
          VoxoConfig(apiUrl: 'https://api.voxo.chat/api', tenantId: tenantId);
      final uri = config.conversationSocketUri('a/b c');
      expect(uri.toString(), contains('a%2Fb%20c'));
    });
  });
}
