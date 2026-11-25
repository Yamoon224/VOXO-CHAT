import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/src/core/voxo_socket.dart';
import 'package:voxo_chat/voxo_chat.dart';

VoxoSocketEvent parse(String json) =>
    VoxoSocketEvent.fromJson(jsonDecode(json) as Map<String, dynamic>);

void main() {
  group('VoxoSocketEvent', () {
    test('reconnaît conversation.sync', () {
      final event = parse('{"type":"conversation.sync"}');
      expect(event.isSync, isTrue);
      expect(event.isAgentMessage, isFalse);
    });

    test('reconnaît un message d’agent', () {
      final event = parse(
        '{"type":"message","message":{"id":"srv-1","role":"agent",'
        '"content":"Bonjour, je prends la suite."}}',
      );
      expect(event.isAgentMessage, isTrue);
      expect(event.message!['content'], 'Bonjour, je prends la suite.');
    });

    test('ignore un message d’assistant : il revient déjà par la réponse HTTP',
        () {
      final event = parse(
        '{"type":"message","message":{"id":"srv-2","role":"assistant",'
        '"content":"réponse"}}',
      );
      expect(event.isAgentMessage, isFalse);
    });

    test('lit le handoff porté par n’importe quel événement', () {
      final event = parse(
        '{"type":"conversation.sync","handoff":{"status":"human",'
        '"assignedAgent":{"id":"u-1","name":"Awa Diop"}}}',
      );
      expect(event.handoff!.status, VoxoHandoffStatus.human);
      expect(event.handoff!.agentName, 'Awa Diop');
    });

    test('tolère une charge sans type ni handoff', () {
      final event = parse('{}');
      expect(event.type, isNull);
      expect(event.handoff, isNull);
      expect(event.isSync, isFalse);
    });
  });

  group('VoxoHandoff.label', () {
    test('annonce le conseiller qui a pris la main', () {
      const handoff =
          VoxoHandoff(status: VoxoHandoffStatus.human, agentName: 'Awa Diop');
      expect(handoff.label, 'Vous échangez avec Awa Diop');
      expect(handoff.isHandledByHuman, isTrue);
    });

    test('reste générique quand le nom du conseiller manque', () {
      const handoff = VoxoHandoff(status: VoxoHandoffStatus.human);
      expect(handoff.label, 'Vous échangez avec un conseiller');
    });

    test('annonce l’attente d’un conseiller', () {
      const handoff = VoxoHandoff(status: VoxoHandoffStatus.waiting);
      expect(handoff.label, 'Un conseiller a été prévenu');
    });

    test('ne dit rien quand l’assistant répond seul : c’est la connectivité '
        'qui s’affiche alors', () {
      expect(const VoxoHandoff().label, isNull);
    });

    test('lit aussi la forme de l’historique (handoffStatus)', () {
      final handoff = VoxoHandoff.fromJson({
        'handoffStatus': 'waiting',
        'handoffReason': 'demande explicite',
        'assignedAgent': null,
      });
      expect(handoff.status, VoxoHandoffStatus.waiting);
      expect(handoff.reason, 'demande explicite');
    });
  });
}
