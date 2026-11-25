import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:voxo_chat/src/core/voxo_api_client.dart';
import 'package:voxo_chat/src/core/voxo_conversation_state.dart';
import 'package:voxo_chat/src/core/voxo_conversation_sync.dart';
import 'package:voxo_chat/src/core/voxo_device_prefs.dart';
import 'package:voxo_chat/src/core/voxo_push_registrar.dart';
import 'package:voxo_chat/src/core/voxo_session_store.dart';
import 'package:voxo_chat/src/core/voxo_socket.dart';
import 'package:voxo_chat/src/core/voxo_typing_sender.dart';
import 'package:voxo_chat/voxo_chat.dart';

import 'support/controller_harness.dart';
import 'support/fake_backend.dart';

/// appId, notifications push, aperçu de saisie et historique archivé.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late List<http.Request> requests;
  late List<http.Response> queue;

  http.Response ok(Map<String, dynamic> data) =>
      http.Response(jsonEncode({'success': true, 'data': data}), 200);

  http.Response failure(int status, String code, [String error = 'x']) =>
      http.Response(
        jsonEncode({'success': false, 'error': error, 'code': code}),
        status,
      );

  http.Client mock() => MockClient((request) async {
    requests.add(request);
    return queue.removeAt(0);
  });

  VoxoConfig config({String? appId}) =>
      VoxoConfig(apiUrl: apiUrl, tenantId: tenantId, appId: appId);

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    requests = [];
    queue = [];
  });

  group('appId', () {
    test('voyage en X-App-Id et en paramètre du socket, seulement si connu', () async {
      final withId = config(appId: ' com.exemple.app ');
      queue.add(ok({'status': 'healthy'}));
      await VoxoApiClient(withId, httpClient: mock()).isHealthy();
      expect(requests.single.headers['X-App-Id'], 'com.exemple.app');
      expect(
        withId.conversationSocketUri('s').queryParameters['appId'],
        'com.exemple.app',
      );

      final without = config();
      queue.add(ok({'status': 'healthy'}));
      await VoxoApiClient(without, httpClient: mock()).isHealthy();
      expect(requests.last.headers.containsKey('X-App-Id'), isFalse);
      expect(
        without.conversationSocketUri('s').queryParameters.containsKey('appId'),
        isFalse,
      );
      expect(config(appId: '   ').appId, isNull);
    });
  });

  group('notifications push', () {
    VoxoPushRegistrar registrar(String Function() session) => VoxoPushRegistrar(
      api: VoxoApiClient(config(), httpClient: mock()),
      prefs: VoxoDevicePrefs(config()),
      config: config(),
      sessionId: session,
    );

    Map<String, dynamic> body(http.Request request) =>
        jsonDecode(request.body) as Map<String, dynamic>;

    test('envoie le jeton lié à la session courante, une nouvelle session le déplace', () async {
      var session = 's1';
      final push = registrar(() => session);
      queue.add(ok({'registered': true}));
      await push.register('tok-1', VoxoPushPlatform.fcm);

      expect(requests.single.url.path, '/api/widget/push-token');
      expect(requests.single.method, 'POST');
      expect(requests.single.headers['X-Tenant-ID'], tenantId);
      expect(body(requests.single), {
        'sessionId': 's1',
        'token': 'tok-1',
        'platform': 'fcm',
        'locale': 'fr',
      });

      session = 's2';
      queue.add(ok({'registered': true}));
      await push.syncSession();
      expect(body(requests.last)['sessionId'], 's2');
    });

    test('un jeton enregistré est relié après un redémarrage', () async {
      queue.add(ok({'registered': true}));
      await registrar(() => 's1').register('tok-1', VoxoPushPlatform.apns);

      final restarted = registrar(() => 's9');
      await restarted.load();
      queue.add(ok({'registered': true}));
      await restarted.syncSession();
      expect(body(requests.last)['sessionId'], 's9');
      expect(body(requests.last)['platform'], 'apns');
    });

    test('PUSH_NOT_ENABLED coupe les tentatives, en silence, jusqu’au prochain jeton', () async {
      final push = registrar(() => 's1');
      queue.add(failure(403, 'PUSH_NOT_ENABLED'));
      await push.register('tok-1', VoxoPushPlatform.fcm); // ne lève pas
      final before = requests.length;
      await push.syncSession();
      expect(requests.length, before);

      queue.add(ok({'registered': true}));
      await push.register('tok-2', VoxoPushPlatform.fcm);
      expect(requests.length, before + 1);
    });

    test('une panne n’atteint jamais l’utilisateur et ne désactive rien', () async {
      final push = registrar(() => 's1');
      queue.add(failure(500, 'INTERNAL', 'Panne'));
      await push.register('tok-1', VoxoPushPlatform.fcm);
      queue.add(ok({'registered': true}));
      await push.syncSession();
      expect(requests.length, 2);
    });

    test('unregister oublie le jeton côté serveur et localement', () async {
      final push = registrar(() => 's1');
      queue.add(ok({'registered': true}));
      await push.register('tok-1', VoxoPushPlatform.fcm);
      queue.add(ok({'removed': true}));
      await push.unregister();

      expect(requests.last.method, 'DELETE');
      expect(body(requests.last), {'token': 'tok-1'});
      final before = requests.length;
      await push.syncSession();
      expect(requests.length, before);
      expect(await VoxoDevicePrefs(config()).loadPushToken(), isNull);
    });
  });

  group('aperçu de saisie — cadence', () {
    late _ManualClock clock;
    late List<String> sent;

    VoxoTypingSender sender({
      bool Function()? eligible,
      bool Function(String)? send,
    }) => VoxoTypingSender(
      clock: () => clock.now,
      schedule: clock.schedule,
      isEligible: eligible ?? () => true,
      send: send ??
          (text) {
            sent.add(text);
            return true;
          },
    );

    setUp(() {
      clock = _ManualClock();
      sent = [];
    });

    test('une trame par 200 ms au plus, la dernière valeur arrive toujours', () {
      final typing = sender();
      typing.submit('b');
      typing.submit('bo');
      typing.submit('bon');
      expect(sent, ['b']);
      clock.advance(199);
      expect(sent, ['b']);
      clock.advance(2);
      expect(sent, ['b', 'bon']);
    });

    test('vider le champ envoie une trame vide, sans jamais répéter une valeur', () {
      final typing = sender();
      typing.submit('salut');
      clock.advance(300);
      typing.submit('salut');
      typing.submit('');
      typing.submit('');
      expect(sent, ['salut', '']);
    });

    test('rien ne part sans autorisation, et le texte est plafonné à 500 caractères', () {
      var allowed = false;
      final typing = sender(eligible: () => allowed);
      typing.submit('secret');
      clock.advance(1000);
      expect(sent, isEmpty);

      allowed = true;
      typing.submit('x' * 900);
      expect(sent.single.length, 500);
    });

    test('une trame non émise est rejouée à la modification suivante', () {
      var open = false;
      final received = <String>[];
      final typing = sender(
        send: (text) {
          if (open) received.add(text);
          return open;
        },
      );
      typing.submit('a');
      open = true;
      clock.advance(300);
      typing.submit('ab');
      expect(received, ['ab']);
    });
  });

  group('aperçu de saisie — controller', () {
    late FakeBackend backend;
    late FakeWebSocketChannel channel;
    late VoxoController controller;

    Future<void> settle() => Future<void>.delayed(Duration.zero);

    Future<void> start({bool enableLiveTyping = true}) async {
      controller = buildController(
        backend: backend,
        channel: channel,
        options: VoxoOptions(
          enableInactivityMonitor: false,
          enableLiveTyping: enableLiveTyping,
        ),
      );
      await controller.init();
      await settle();
    }

    void humanTakesOver() => channel.emit({
      'type': 'conversation.sync',
      'handoff': {
        'status': 'human',
        'assignedAgent': {'name': 'Léa'},
      },
    });

    setUp(() {
      backend = FakeBackend()..liveTypingPreview = true;
      channel = FakeWebSocketChannel();
    });

    tearDown(() => controller.dispose());

    test('la trame est {"type":"typing","text":…}, après prise en charge humaine', () async {
      await start();
      controller.notifyTyping('avant');
      expect(channel.sent, isEmpty, reason: 'pas encore de conseiller');

      humanTakesOver();
      await settle();
      controller.notifyTyping('bonjour');
      expect(channel.sent.map((f) => jsonDecode(f as String)), [
        {'type': 'typing', 'text': 'bonjour'},
      ]);
    });

    test('rien ne part si le propriétaire ne l’a pas activé', () async {
      backend.liveTypingPreview = false;
      await start();
      humanTakesOver();
      await settle();
      controller.notifyTyping('bonjour');
      expect(channel.sent, isEmpty);
    });

    test('rien ne part si l’application l’a désactivé', () async {
      await start(enableLiveTyping: false);
      humanTakesOver();
      await settle();
      controller.notifyTyping('bonjour');
      expect(channel.sent, isEmpty);
    });

    test('sendMessage efface l’aperçu chez le conseiller', () async {
      await start();
      humanTakesOver();
      await settle();
      controller.notifyTyping('bonjour');
      await controller.sendMessage('bonjour');
      // La trame vide respecte la cadence de 200 ms : elle part juste après.
      await Future<void>.delayed(const Duration(milliseconds: 250));
      final texts = channel.sent
          .map((f) => (jsonDecode(f as String) as Map)['text'])
          .toList();
      expect(texts.last, '');
    });
  });

  group('historique archivé', () {
    VoxoConversationSync sync(VoxoConversationState state) {
      final cfg = config();
      return VoxoConversationSync(
        api: VoxoApiClient(cfg, httpClient: mock()),
        socket: VoxoSocket(cfg),
        store: VoxoSessionStore(cfg),
        state: state,
        config: cfg,
      );
    }

    test('relit une conversation archivée sans toucher à la session active', () async {
      final state = VoxoConversationState(sessionId: 'active');
      queue.add(ok({
        'messages': [
          {'id': 'm1', 'role': 'user', 'content': 'Bonjour'},
          {'id': 'm2', 'role': 'agent', 'content': 'Salut'},
        ],
        'handoffStatus': 'human',
        'assignedAgent': {'name': 'Léa'},
      }));

      final archived = await sync(state).loadArchived('old');

      expect(archived.messages.map((m) => m.text), ['Bonjour', 'Salut']);
      expect(archived.handoff.agentName, 'Léa');
      expect(state.sessionId, 'active');
      expect(state.isEmpty, isTrue);
      expect(requests.single.url.path, '/api/widget/conversation/old');
      expect(requests.single.url.queryParameters['limit'], '100');
    });

    test('une conversation purgée devient « Historique indisponible »', () async {
      queue.add(failure(404, 'CONVERSATION_NOT_FOUND'));
      await expectLater(
        sync(VoxoConversationState()).loadArchived('gone'),
        throwsA(
          isA<VoxoException>()
              .having((e) => e.code, 'code', 'HISTORY_UNAVAILABLE')
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.message, 'message', 'Historique indisponible'),
        ),
      );
    });

    test('une autre erreur est relayée telle quelle', () async {
      queue.add(failure(500, 'INTERNAL', 'Panne serveur'));
      await expectLater(
        sync(VoxoConversationState()).loadArchived('s'),
        throwsA(isA<VoxoException>().having((e) => e.message, 'message', 'Panne serveur')),
      );
    });

    test('les textes de l’historique existent dans les deux langues', () {
      for (final key in [
        'historyTitle',
        'historyTooltip',
        'noHistory',
        'historyUnavailable',
        'backLabel',
      ]) {
        expect(VoxoI18n.text('fr', key), isNot(key));
        expect(VoxoI18n.text('en', key), isNot(key));
      }
    });
  });
}

/// Horloge et planificateur pilotés à la main : pas de `fake_async` en
/// dépendance, et le temps ne dépend jamais de la vitesse de la machine.
class _ManualClock {
  int now = 0;
  final List<_ManualTimer> _timers = [];

  Timer schedule(Duration delay, void Function() callback) {
    final timer = _ManualTimer(now + delay.inMilliseconds, callback);
    _timers.add(timer);
    return timer;
  }

  void advance(int milliseconds) {
    final target = now + milliseconds;
    while (true) {
      final due = _timers.where((t) => t.isActive && t.due <= target).toList()
        ..sort((a, b) => a.due.compareTo(b.due));
      if (due.isEmpty) break;
      now = due.first.due;
      due.first.fire();
    }
    now = target;
  }
}

class _ManualTimer implements Timer {
  _ManualTimer(this.due, this._callback);

  final int due;
  final void Function() _callback;
  bool _active = true;

  void fire() {
    _active = false;
    _callback();
  }

  @override
  void cancel() => _active = false;

  @override
  bool get isActive => _active;

  @override
  int get tick => 0;
}
