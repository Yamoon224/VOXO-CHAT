import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:stream_channel/stream_channel.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Backend simulé reproduisant les enveloppes réelles de `/widget/*`.
///
/// Les formes de réponse sont celles décrites dans `mobile/CONTRACT.md` : si le
/// backend change, ce fichier doit changer avec lui, et les tests qui s'appuient
/// dessus révèlent alors ce qui casse côté SDK.
class FakeBackend {
  FakeBackend({this.conversationExists = false});

  /// Requêtes reçues, dans l'ordre : sert à vérifier les en-têtes et payloads.
  final List<http.Request> requests = [];

  /// Seulement les `POST /widget/message`.
  ///
  /// Utile parce que `init` déclenche aussi config, quick-replies et
  /// historique — dont certains en arrière-plan : compter toutes les requêtes
  /// rendrait les assertions dépendantes de l'ordonnancement.
  List<http.Request> get sentMessages => requests
      .where((request) => request.url.path.endsWith('/widget/message'))
      .toList();

  /// Quand false, `GET /widget/conversation/:id` répond 404 — le cas normal
  /// d'une session neuve.
  bool conversationExists;

  /// Messages du fil côté serveur, renvoyés par l'historique.
  final List<Map<String, dynamic>> conversationMessages = [];

  /// Réponse à donner au prochain `POST /widget/message`.
  String assistantReply = 'Bonjour, en quoi puis-je aider ?';
  List<String> suggestions = const [];

  /// Bascule le prochain message sur une nouvelle session, comme le fait le
  /// backend quand il ouvre une conversation.
  String? nextSessionId;

  /// Valeur de `options.features.liveTypingPreview` annoncée par la config.
  bool liveTypingPreview = false;

  /// Force un échec sur le prochain `POST /widget/message`.
  int? failMessageWithStatus;
  String failMessageError = 'Une erreur est survenue';
  String failMessageCode = 'WIDGET_ERROR';

  http.Client get client => MockClient(_handle);

  Future<http.Response> _handle(http.Request request) async {
    requests.add(request);
    final path = request.url.path;

    if (path.endsWith('/widget/config')) return _ok(_config());
    if (path.endsWith('/widget/quick-replies')) {
      return _ok({'suggestions': suggestions, 'category': 'greeting'});
    }
    if (path.endsWith('/widget/health')) return _ok({'status': 'healthy'});
    if (path.endsWith('/widget/message')) return _message(request);
    if (path.endsWith('/end') || path.endsWith('/timeout')) {
      return _ok({'sessionId': 'closed'});
    }
    if (path.endsWith('/message-feedback')) return _ok({'ok': true});
    if (path.contains('/widget/conversation/')) return _conversation();

    return http.Response('{"success":false,"error":"Route inconnue"}', 404);
  }

  Future<http.Response> _message(http.Request request) async {
    if (failMessageWithStatus != null) {
      final status = failMessageWithStatus!;
      failMessageWithStatus = null;
      return http.Response(
        jsonEncode({
          'success': false,
          'error': failMessageError,
          'code': failMessageCode,
        }),
        status,
        headers: _jsonHeader,
      );
    }

    final body = jsonDecode(request.body) as Map<String, dynamic>;
    final sessionId = nextSessionId ?? body['sessionId'] as String;
    nextSessionId = null;

    return _ok({
      'sessionId': sessionId,
      'response': assistantReply,
      'userMessageId': 'srv-user-${requests.length}',
      'assistantMessageId': 'srv-bot-${requests.length}',
      'sources': const [],
      'suggestions': suggestions,
      'conversationId': 'conv-1',
    });
  }

  Future<http.Response> _conversation() async {
    if (!conversationExists) {
      return http.Response(
        jsonEncode({'success': false, 'error': 'Conversation not found'}),
        404,
        headers: _jsonHeader,
      );
    }
    return _ok({
      'sessionId': 'session',
      'messages': conversationMessages,
      'totalMessages': conversationMessages.length,
      'handoffStatus': 'none',
      'assignedAgent': null,
    });
  }

  static const Map<String, String> _jsonHeader = {
    'content-type': 'application/json; charset=utf-8',
  };

  Future<http.Response> _ok(Map<String, dynamic> data) async => http.Response(
        jsonEncode({'success': true, 'data': data, 'message': 'ok'}),
        200,
        headers: _jsonHeader,
      );

  Map<String, dynamic> _config() => {
    'tenant': {'id': 't-1', 'name': 'Acme', 'subscriptionPlan': 'pro'},
    'chatbot': {
      'name': 'Assistant Acme',
      'welcomeMessage': 'Bonjour ! Comment puis-je vous aider ?',
      'theme': {'primaryColor': '#7c3aed', 'textColor': '#111827'},
      'features': {'customBranding': false},
      'options': {
        'enableMarkdown': true,
        'ui': <String, dynamic>{},
        'features': {
          'messageFeedback': true,
          'conversationRating': true,
          'showTimestamps': true,
          'showDeliveryStatus': true,
          'dateSeparators': true,
          'connectivityStatus': true,
          'attachments': true,
          'liveTypingPreview': liveTypingPreview,
        },
        'attachments': {'maxFiles': 3, 'maxBytes': 10485760},
      },
    },
  };
}

/// Canal WebSocket simulé : permet de pousser des événements serveur dans le
/// SDK sans ouvrir de vraie connexion.
class FakeWebSocketChannel extends StreamChannelMixin
    implements WebSocketChannel {
  final StreamController<dynamic> _incoming =
      StreamController<dynamic>.broadcast();

  /// Trames écrites par le SDK (aperçu de saisie uniquement).
  final List<dynamic> sent = [];

  /// Pousse un événement, tel que `conversationSocketService` l'émettrait.
  void emit(Map<String, dynamic> event) => emitRaw(jsonEncode(event));

  /// Pousse une charge brute, pour éprouver les entrées malformées.
  void emitRaw(String payload) => _incoming.add(payload);

  @override
  Stream<dynamic> get stream => _incoming.stream;

  @override
  WebSocketSink get sink => _FakeWebSocketSink(_incoming, sent);

  @override
  String? get protocol => null;

  @override
  int? get closeCode => null;

  @override
  String? get closeReason => null;

  @override
  Future<void> get ready => Future<void>.value();
}

class _FakeWebSocketSink implements WebSocketSink {
  _FakeWebSocketSink(this._controller, this._sent);

  final StreamController<dynamic> _controller;
  final List<dynamic> _sent;

  @override
  void add(dynamic data) => _sent.add(data);

  @override
  Future<void> close([int? closeCode, String? closeReason]) async {
    if (!_controller.isClosed) await _controller.close();
  }

  // Seule l'écriture compte ici : le reste de l'interface n'a pas besoin d'un
  // comportement réel.
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}
