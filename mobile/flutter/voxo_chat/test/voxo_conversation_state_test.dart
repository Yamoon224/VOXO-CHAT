import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/src/core/voxo_conversation_state.dart';
import 'package:voxo_chat/voxo_chat.dart';

VoxoMessage user(String text, {String? serverId, VoxoDeliveryStatus? status}) =>
    VoxoMessage(
      role: VoxoRole.user,
      text: text,
      serverId: serverId,
      deliveryStatus: status,
    );

VoxoMessage bot(String text, {String? serverId, bool welcome = false}) =>
    VoxoMessage(
      role: VoxoRole.assistant,
      text: text,
      serverId: serverId,
      isWelcome: welcome,
    );

void main() {
  late VoxoConversationState state;
  setUp(() => state = VoxoConversationState());

  group('add', () {
    test('ne compte que les messages de l’utilisateur', () {
      state
        ..add(user('bonjour'))
        ..add(bot('salut'))
        ..add(user('merci'));
      expect(state.messageCount, 2);
    });

    test('date le début de la conversation au premier message', () {
      expect(state.conversationStartedAt, isNull);
      state.add(user('bonjour'));
      expect(state.conversationStartedAt, isNotNull);
      expect(state.durationMs, isNonNegative);
    });

    test('évince les plus anciens au-delà du plafond mémoire', () {
      for (var i = 0; i < VoxoLimits.maxMessagesInMemory + 10; i++) {
        state.add(bot('message $i'));
      }
      expect(state.messages, hasLength(VoxoLimits.maxMessagesInMemory));
      expect(state.messages.first.text, 'message 10');
    });
  });

  group('ordered', () {
    test('trie par horodatage, quel que soit l’ordre d’arrivée', () {
      final now = DateTime(2026, 8, 23, 12);
      state
        ..add(VoxoMessage(
            role: VoxoRole.assistant,
            text: 'tard',
            timestamp: now.add(const Duration(minutes: 5))))
        ..add(VoxoMessage(role: VoxoRole.user, text: 'tôt', timestamp: now));
      expect(state.ordered.map((m) => m.text), ['tôt', 'tard']);
    });
  });

  group('hasServerId', () {
    test('reconnaît un message déjà reçu : c’est le garde-fou anti-doublon '
        'quand le socket relivre une réponse', () {
      state.add(bot('réponse', serverId: 'srv-1'));
      expect(state.hasServerId('srv-1'), isTrue);
      expect(state.hasServerId('srv-2'), isFalse);
      expect(state.hasServerId(null), isFalse);
    });
  });

  group('hasServerReply', () {
    test('faux tant qu’aucune réponse n’est confirmée par le serveur', () {
      state
        ..add(user('bonjour'))
        ..add(bot('accueil', welcome: true));
      expect(state.hasServerReply, isFalse);
    });

    test('vrai dès qu’une réponse porte un serverId', () {
      state.add(bot('réponse', serverId: 'srv-1'));
      expect(state.hasServerReply, isTrue);
    });
  });

  group('update', () {
    test('met à jour le statut et le serverId en place', () {
      final message = state.add(user('bonjour', status: VoxoDeliveryStatus.sending));
      state.update(message.id,
          serverId: 'srv-9', deliveryStatus: VoxoDeliveryStatus.answered);
      expect(state.messages.single.serverId, 'srv-9');
      expect(state.messages.single.deliveryStatus, VoxoDeliveryStatus.answered);
    });

    test('clearFeedback retire l’avis, là où passer null le conserverait', () {
      final message = state.add(bot('réponse', serverId: 'srv-1'));
      state.update(message.id, feedback: VoxoFeedback.up);
      expect(state.messages.single.feedback, VoxoFeedback.up);

      state.update(message.id, clearFeedback: true);
      expect(state.messages.single.feedback, isNull);
    });

    test('renvoie null pour un message inconnu', () {
      expect(state.update('inexistant', serverId: 'x'), isNull);
    });
  });

  group('replaceWithHistory', () {
    test('conserve un message encore en vol, absent côté serveur', () {
      state
        ..add(user('ancien', serverId: 'srv-1', status: VoxoDeliveryStatus.answered))
        ..add(user('en cours', status: VoxoDeliveryStatus.sending));

      state.replaceWithHistory([
        user('ancien', serverId: 'srv-1', status: VoxoDeliveryStatus.answered),
        bot('réponse', serverId: 'srv-2'),
      ]);

      expect(state.messages.map((m) => m.text),
          ['ancien', 'réponse', 'en cours']);
    });

    test('conserve un message en échec pour laisser un nouvel essai possible', () {
      state.add(user('raté', status: VoxoDeliveryStatus.failed));
      state.replaceWithHistory([bot('réponse', serverId: 'srv-1')]);
      expect(state.lastFailed, isNotNull);
      expect(state.lastFailed!.text, 'raté');
    });

    test('garde le message d’accueil quand le serveur ne renvoie rien', () {
      state.add(bot('Bonjour !', welcome: true));
      state.replaceWithHistory([]);
      expect(state.messages.single.text, 'Bonjour !');
    });

    test('efface le message d’accueil dès que le serveur a un fil', () {
      state.add(bot('Bonjour !', welcome: true));
      state.replaceWithHistory([bot('vraie réponse', serverId: 'srv-1')]);
      expect(state.messages.map((m) => m.text), ['vraie réponse']);
    });
  });

  group('reset', () {
    test('ouvre une session neuve et remet les compteurs à zéro', () {
      final previousSessionId = state.sessionId;
      state
        ..add(user('bonjour'))
        ..sessionEnded = true;

      state.reset();

      expect(state.sessionId, isNot(previousSessionId));
      expect(state.messages, isEmpty);
      expect(state.messageCount, 0);
      expect(state.sessionEnded, isFalse);
      expect(state.conversationStartedAt, isNull);
    });
  });
}
