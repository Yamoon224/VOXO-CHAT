import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:voxo_chat/voxo_chat.dart';

import 'support/controller_harness.dart';
import 'support/fake_backend.dart';

/// Flux temps réel, clôture et avis.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeBackend backend;
  late FakeWebSocketChannel channel;
  late VoxoController controller;

  VoxoController build() =>
      buildController(backend: backend, channel: channel);

  /// Laisse le tour de boucle nécessaire à la remontée d'un événement socket.
  Future<void> settle() => Future<void>.delayed(Duration.zero);

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    backend = FakeBackend();
    channel = FakeWebSocketChannel();
  });

  tearDown(() => controller.dispose());

  group('temps réel', () {
    test('ajoute un message d’agent et bascule le statut de reprise', () async {
      controller = build();
      await controller.init();

      channel.emit({
        'type': 'message',
        'message': {
          'id': 'srv-agent-1',
          'role': 'agent',
          'content': 'Bonjour, je prends la suite.',
          'timestamp': DateTime.now().toIso8601String(),
        },
        'handoff': {
          'status': 'human',
          'assignedAgent': {'id': 'u-1', 'name': 'Moussa Fall'},
        },
      });
      await settle();

      expect(controller.handoff.status, VoxoHandoffStatus.human);
      expect(controller.handoff.label, 'Vous échangez avec Moussa Fall');
      expect(controller.messages.last.role, VoxoRole.agent);
      expect(controller.messages.last.text, 'Bonjour, je prends la suite.');
    });

    test('ne duplique pas un message d’agent relivré', () async {
      controller = build();
      await controller.init();

      final event = {
        'type': 'message',
        'message': {
          'id': 'srv-agent-1',
          'role': 'agent',
          'content': 'Bonjour',
          'timestamp': DateTime.now().toIso8601String(),
        },
      };
      channel.emit(event);
      await settle();
      channel.emit(event);
      await settle();

      expect(
        controller.messages.where((m) => m.serverId == 'srv-agent-1'),
        hasLength(1),
      );
    });

    test('ignore un message d’assistant : il arrive déjà par la réponse HTTP',
        () async {
      controller = build();
      await controller.init();
      final before = controller.messages.length;

      channel.emit({
        'type': 'message',
        'message': {
          'id': 'srv-bot-99',
          'role': 'assistant',
          'content': 'doublon',
          'timestamp': DateTime.now().toIso8601String(),
        },
      });
      await settle();

      expect(controller.messages, hasLength(before));
    });

    test('un événement illisible ne casse pas le flux', () async {
      controller = build();
      await controller.init();

      channel.emitRaw('pas du json');
      await settle();
      channel.emit({
        'handoff': {'status': 'waiting'},
      });
      await settle();

      expect(controller.handoff.status, VoxoHandoffStatus.waiting);
      expect(controller.handoff.label, 'Un conseiller a été prévenu');
    });
  });

  group('clôture et avis', () {
    test('canRate reste faux tant que l’assistant n’a pas répondu', () async {
      controller = build();
      await controller.init();
      expect(controller.canRate, isFalse);

      await controller.sendMessage('bonjour');
      expect(controller.canRate, isTrue);
    });

    test('la notation clôt la session', () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      final closed =
          await controller.endConversation(rating: 5, feedback: 'Parfait');
      expect(closed, isTrue);
      expect(controller.sessionEnded, isTrue);
    });

    test('le feedback cible le serverId, jamais l’identifiant local', () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      final reply = controller.messages.last;
      await controller.submitFeedback(reply, VoxoFeedback.up);

      final request = backend.requests
          .firstWhere((r) => r.url.path.endsWith('/message-feedback'));
      expect(request.body, contains('"messageId":"${reply.serverId}"'));
      expect(request.body, contains('"value":"up"'));
    });

    test('rejouer le même avis le retire', () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');

      await controller.submitFeedback(
          controller.messages.last, VoxoFeedback.up);
      await controller.submitFeedback(
          controller.messages.last, VoxoFeedback.up);

      expect(controller.messages.last.feedback, isNull);
    });

    test('une nouvelle session archive la précédente et repart à vide',
        () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');
      final previous = controller.sessionId;

      await controller.startNewSession();

      expect(controller.sessionId, isNot(previous));
      expect(controller.messages.single.text,
          'Bonjour ! Comment puis-je vous aider ?');
      expect(await controller.history(), hasLength(1));
    });

    test('envoyer après une clôture rouvre automatiquement une session',
        () async {
      controller = build();
      await controller.init();
      await controller.sendMessage('bonjour');
      await controller.endConversation(rating: 4);
      final closedSession = controller.sessionId;

      await controller.sendMessage('une autre question');

      expect(controller.sessionEnded, isFalse);
      expect(controller.sessionId, isNot(closedSession));
      expect(controller.messages.map((m) => m.text),
          contains('une autre question'));
    });
  });
}
