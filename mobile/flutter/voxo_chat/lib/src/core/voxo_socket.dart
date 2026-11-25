import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/voxo_handoff.dart';
import 'voxo_config.dart';
import 'voxo_limits.dart';

/// Événement descendant du flux de conversation.
///
/// Le socket est descendant : la seule trame montante est l'aperçu de saisie
/// ([VoxoSocket.sendTyping]). L'envoi d'un message passe par
/// `POST /widget/message`.
class VoxoSocketEvent {
  const VoxoSocketEvent({this.type, this.handoff, this.message});

  /// `conversation.sync` (recharger l'historique) ou `message`.
  final String? type;

  /// Présent sur n'importe quel événement dès que l'état de reprise change.
  final VoxoHandoff? handoff;

  /// Charge brute du message, au format de l'historique.
  final Map<String, dynamic>? message;

  bool get isSync => type == 'conversation.sync';

  /// Seuls les messages d'agent arrivent par ce canal : les réponses de
  /// l'assistant reviennent déjà dans la réponse de `POST /widget/message`.
  bool get isAgentMessage =>
      type == 'message' && message != null && message!['role'] == 'agent';

  factory VoxoSocketEvent.fromJson(Map<String, dynamic> json) {
    final handoff = json['handoff'];
    final message = json['message'];
    return VoxoSocketEvent(
      type: json['type'] as String?,
      handoff: handoff is Map<String, dynamic>
          ? VoxoHandoff.fromJson(handoff)
          : null,
      message: message is Map<String, dynamic> ? message : null,
    );
  }
}

/// Connexion au flux temps réel d'une conversation, avec reconnexion
/// automatique en backoff exponentiel plafonné à 15 s.
class VoxoSocket {
  VoxoSocket(this._config, {WebSocketChannel Function(Uri)? connector})
      : _connect = connector ?? WebSocketChannel.connect;

  final VoxoConfig _config;
  final WebSocketChannel Function(Uri) _connect;
  final StreamController<VoxoSocketEvent> _events =
      StreamController<VoxoSocketEvent>.broadcast();

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  String? _sessionId;
  int _attempt = 0;
  bool _disposed = false;
  bool _isOpen = false;

  Stream<VoxoSocketEvent> get events => _events.stream;

  /// Ouvre le flux de [sessionId]. Un appel sur une session déjà connectée est
  /// sans effet ; sur une autre session, la connexion précédente est fermée.
  void connect(String sessionId) {
    if (_disposed) return;
    if (_sessionId == sessionId && _channel != null) return;
    _sessionId = sessionId;
    _attempt = 0;
    _open();
  }

  void _open() {
    _reconnectTimer?.cancel();
    _closeChannel();

    final sessionId = _sessionId;
    if (sessionId == null || _disposed) return;

    try {
      final channel = _connect(_config.conversationSocketUri(sessionId));
      _channel = channel;
      channel.ready.then((_) {
        if (_channel == channel) _isOpen = true;
      }, onError: (_) {});
      _subscription = channel.stream.listen(
        (payload) => _emit(payload, sessionId),
        // Le socket ne remonte aucune erreur applicative : un refus
        // d'autorisation détruit la connexion sans handshake. Toute
        // terminaison, propre ou non, mène donc à une nouvelle tentative.
        onError: (_) => _scheduleReconnect(sessionId),
        onDone: () => _scheduleReconnect(sessionId),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect(sessionId);
    }
  }

  void _emit(dynamic payload, String sessionId) {
    if (sessionId != _sessionId) return;
    _attempt = 0;
    if (payload is! String) return;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        _events.add(VoxoSocketEvent.fromJson(decoded));
      }
    } on FormatException {
      // Charge illisible : on l'ignore plutôt que de rompre le flux.
    }
  }

  /// `min(1000 × 2^tentative, 15000)` ms. La tentative est abandonnée si la
  /// session a changé entre-temps : le socket est indexé sur le `sessionId`.
  void _scheduleReconnect(String sessionId) {
    _closeChannel();
    if (_disposed || sessionId != _sessionId) return;

    final delayMs = min(
      VoxoLimits.socketReconnectBase.inMilliseconds * pow(2, _attempt++).toInt(),
      VoxoLimits.socketReconnectMax.inMilliseconds,
    );
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), () {
      if (sessionId == _sessionId) _open();
    });
  }

  void _closeChannel() {
    _isOpen = false;
    _subscription?.cancel();
    _subscription = null;
    _channel?.sink.close();
    _channel = null;
  }

  /// Seule trame montante : l'aperçu de saisie (voir `CONTRACT.md`). `false` si
  /// le socket n'est pas ouvert — le texte est alors perdu, jamais rejoué.
  bool sendTyping(String text) {
    final channel = _channel;
    if (channel == null || !_isOpen) return false;
    channel.sink.add(jsonEncode({'type': 'typing', 'text': text}));
    return true;
  }

  /// Ferme le flux sans empêcher une reconnexion ultérieure via [connect].
  void disconnect() {
    _reconnectTimer?.cancel();
    _sessionId = null;
    _closeChannel();
  }

  void dispose() {
    _disposed = true;
    disconnect();
    _events.close();
  }
}
