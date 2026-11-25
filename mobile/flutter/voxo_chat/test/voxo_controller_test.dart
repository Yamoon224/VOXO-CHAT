import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:voxo_chat/voxo_chat.dart';

import 'support/controller_harness.dart';
import 'support/fake_backend.dart';

/// Démarrage et envoi de messages, contre un backend simulé qui reproduit les
/// enveloppes réelles de `/widget/*`.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeBackend backend;
  late FakeWebSocketChannel channel;
  late VoxoController controller;

  VoxoController build() =>
      buildController(backend: backend, channel: channel);

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    backend = FakeBackend();
    channel = FakeWebSocketChannel();
  });

  tearDown(() => controller.dispose());

  group('init', () {
    test('charge la configuration du tenant et pose le message d’accueil',
        () async {
      backend.suggestions = ['Vos tarifs ?', 'Où êtes-vous ?'];
      controller = build();
      await controller.init();

      expect(controller.chatbot.name, 'Assistant Acme');
      expect(controller.chatbot.primaryColor, '#7c3aed');
      expect(controller.connectivity, VoxoConnectivity.available);
      expect(controller.messages.single.text,
          'Bonjour ! Comment puis-je vous aider ?');
      expect(controller.messages.single.suggestions, hasLength(2));
    });

    test('pose X-Tenant-ID sur chaque requête', () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      expect(backend.requests, isNotEmpty);
      for (final request in backend.requests) {
        expect(request.headers['X-Tenant-ID'], tenantId,
            reason: request.url.path);
      }
    });

    test('un historique absent (404) n’est pas une erreur affichée', () async {
      backend.conversationExists = false;
      controller = build();
      await controller.init();

      expect(controller.lastError, isNull);
      expect(controller.isReady, isTrue);
    });

    test('une configuration injoignable garde des valeurs par défaut', () async {
      controller = buildController(
        backend: backend,
        channel: channel,
        httpClient: DeadClient(),
      );
      await controller.init();

      expect(controller.connectivity, VoxoConnectivity.unavailable);
      expect(controller.chatbot.name, 'Assistant');
    });
  });

  group('envoi', () {
    test('envoie un clientMessageId en UUID v4, comme l’exige le backend',
        () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      expect(
        uuidV4.hasMatch(clientMessageIdOf(backend.sentMessages.single)!),
        isTrue,
      );
    });

    test('affiche la réponse et marque le message comme répondu', () async {
      backend.assistantReply = 'Nos horaires sont 9h-18h.';
      controller = build();
      await controller.init();
      await controller.sendMessage('vos horaires ?');

      expect(controller.messages.last.text, 'Nos horaires sont 9h-18h.');
      expect(controller.messages.last.role, VoxoRole.assistant);

      final sent =
          controller.messages.firstWhere((m) => m.text == 'vos horaires ?');
      expect(sent.deliveryStatus, VoxoDeliveryStatus.answered);
      expect(sent.serverId, isNotNull);
    });

    test('un message vide sans pièce jointe ne part pas', () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('   ');
      expect(backend.sentMessages, isEmpty);
    });

    test('un message trop long est refusé avant tout appel réseau', () async {
      controller = build();
      await controller.init();

      await controller.sendMessage('a' * (VoxoLimits.maxMessageLength + 1));

      expect(backend.sentMessages, isEmpty);
      expect(controller.lastError, contains('trop long'));
    });

    test('un échec serveur relaie le message français et permet un retry',
        () async {
      backend
        ..failMessageWithStatus = 429
        ..failMessageError = 'Trop de messages envoyés. Veuillez patienter.'
        ..failMessageCode = 'RATE_LIMIT_EXCEEDED';
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      expect(
        controller.lastError,
        'Trop de messages envoyés. Veuillez patienter.',
      );
      final failed = controller.messages.firstWhere((m) => m.isFromUser);
      expect(failed.deliveryStatus, VoxoDeliveryStatus.failed);

      controller.clearError();
      await controller.retry(failed.id);
      expect(
        controller.messages.firstWhere((m) => m.isFromUser).deliveryStatus,
        VoxoDeliveryStatus.answered,
      );
    });

    test(
        'un retry conserve le clientMessageId : le serveur ne doit pas traiter '
        'l’envoi deux fois', () async {
      backend.failMessageWithStatus = 500;
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      final failed = controller.messages.firstWhere((m) => m.isFromUser);
      await controller.retry(failed.id);

      final ids = backend.sentMessages.map(clientMessageIdOf).toList();
      expect(ids, hasLength(2));
      expect(ids.first, ids.last);
    });

    test('adopte la session renvoyée par le serveur quand elle change',
        () async {
      controller = build();
      await controller.init();
      final previous = controller.sessionId;

      backend.nextSessionId = 'b1c2d3e4-1111-4222-8333-444455556666';
      await controller.sendMessage('bonjour');

      expect(controller.sessionId, 'b1c2d3e4-1111-4222-8333-444455556666');
      expect(controller.sessionId, isNot(previous));
    });
  });
}
