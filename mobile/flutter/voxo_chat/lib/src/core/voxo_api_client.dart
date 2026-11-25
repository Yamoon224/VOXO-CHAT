import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'voxo_config.dart';
import 'voxo_envelope.dart';
import 'voxo_exception.dart';
import 'voxo_limits.dart';

/// Client REST des routes publiques `/widget/*`.
///
/// C'est le **seul** point du SDK qui parle au réseau en HTTP. Le header
/// `X-Tenant-ID` est posé ici, sur chaque requête, et nulle part ailleurs. Voir
/// `mobile/CONTRACT.md` pour la forme des payloads.
class VoxoApiClient {
  VoxoApiClient(this._config, {http.Client? httpClient})
    : _http = httpClient ?? http.Client(),
      _ownsClient = httpClient == null;

  final VoxoConfig _config;
  final http.Client _http;
  final bool _ownsClient;

  Map<String, String> get _tenantHeader => {
    'X-Tenant-ID': _config.tenantId,
    'Accept-Language': _config.locale,
    'X-App-Id': ?_config.appId,
  };

  Map<String, String> get _jsonHeaders => {
    ..._tenantHeader,
    'Content-Type': 'application/json',
  };

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('${_config.apiUrl}$path').replace(queryParameters: query);

  /// `POST /widget/message`.
  ///
  /// [clientMessageId] doit être un UUID v4 : c'est lui qui porte l'idempotence
  /// côté serveur, un identifiant d'une autre forme est rejeté en 400.
  Future<Map<String, dynamic>> sendMessage({
    required String message,
    required String sessionId,
    required String clientMessageId,
    required String userId,
    String? userName,
    String? userEmail,
    List<String> attachmentIds = const [],
    Map<String, dynamic> metadata = const {},
  }) => _send(
    () => _http.post(
      _uri('/widget/message'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'message': message,
        'sessionId': sessionId,
        'clientMessageId': clientMessageId,
        'userId': userId,
        'userName': ?userName,
        'userEmail': ?userEmail,
        if (attachmentIds.isNotEmpty) 'attachmentIds': attachmentIds,
        'metadata': {...metadata, 'locale': _config.locale},
      }),
    ),
  );

  /// `POST /widget/upload` — multipart, un seul fichier, champ `file`.
  ///
  /// Aucun `Content-Type` n'est posé à la main : `http` doit écrire lui-même le
  /// `boundary`. Le délai est plus large que les 30 s habituelles, l'extraction
  /// du contenu se faisant pendant la requête.
  Future<Map<String, dynamic>> uploadAttachment(String filePath) async {
    final request = http.MultipartRequest('POST', _uri('/widget/upload'))
      ..headers.addAll(_tenantHeader)
      ..files.add(await http.MultipartFile.fromPath('file', filePath));

    return _send(
      () async => http.Response.fromStream(await _http.send(request)),
      timeout: VoxoLimits.uploadTimeout,
    );
  }

  /// `GET /widget/conversation/:sessionId`.
  ///
  /// Lève une [VoxoException] avec `isNotFound` quand la conversation n'existe
  /// pas encore : c'est le cas **normal** d'une session neuve, à traiter comme
  /// « pas d'historique » et non comme une erreur affichable.
  Future<Map<String, dynamic>> getConversation(
    String sessionId, {
    int limit = 50,
    int offset = 0,
  }) => _send(
    () => _http.get(
      _uri('/widget/conversation/${Uri.encodeComponent(sessionId)}', {
        'limit': '$limit',
        'offset': '$offset',
      }),
      headers: _tenantHeader,
    ),
  );

  /// `POST /widget/conversation/:sessionId/end`.
  Future<Map<String, dynamic>> endConversation(
    String sessionId, {
    int? rating,
    String? feedback,
    int? sessionDurationMs,
    int? messageCount,
  }) => _postConversation(sessionId, 'end', {
    'rating': ?rating,
    if (feedback != null && feedback.isNotEmpty) 'feedback': feedback,
    'sessionDuration': sessionDurationMs,
    'messageCount': messageCount,
  });

  /// `POST /widget/conversation/:sessionId/timeout`. Le motif de clôture est
  /// imposé par la route ; le client ne peut pas le choisir.
  Future<Map<String, dynamic>> endConversationForInactivity(
    String sessionId, {
    int? sessionDurationMs,
    int? messageCount,
  }) => _postConversation(sessionId, 'timeout', {
    'sessionDuration': sessionDurationMs,
    'messageCount': messageCount,
  });

  /// `POST /widget/conversation/:sessionId/message-feedback`.
  ///
  /// [messageId] est le `serverId` du message, jamais l'identifiant local.
  /// [value] à `null` retire l'avis.
  Future<Map<String, dynamic>> sendMessageFeedback(
    String sessionId, {
    String? messageId,
    int? messageIndex,
    String? value,
  }) => _postConversation(sessionId, 'message-feedback', {
    'messageId': ?messageId,
    'messageIndex': ?messageIndex,
    'value': value,
  });

  /// `POST /widget/push-token` : lie le jeton de notification à la session.
  Future<Map<String, dynamic>> registerPushToken({
    required String sessionId,
    required String token,
    required String platform,
    required String locale,
  }) => _send(
    () => _http.post(
      _uri('/widget/push-token'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'sessionId': sessionId,
        'token': token,
        'platform': platform,
        'locale': locale,
      }),
    ),
  );

  /// `DELETE /widget/push-token` : oublie le jeton côté serveur.
  Future<Map<String, dynamic>> unregisterPushToken(String token) => _send(
    () => _http.delete(
      _uri('/widget/push-token'),
      headers: _jsonHeaders,
      body: jsonEncode({'token': token}),
    ),
  );

  /// `GET /widget/config` — thème, nom, message d'accueil, fonctionnalités.
  Future<Map<String, dynamic>> getConfig() =>
      _send(() => _http.get(_uri('/widget/config'), headers: _tenantHeader));

  /// `GET /widget/quick-replies` — suggestions de démarrage.
  Future<Map<String, dynamic>> getQuickReplies({
    String category = 'greeting',
  }) => _send(
    () => _http.get(
      _uri('/widget/quick-replies', {'category': category}),
      headers: _tenantHeader,
    ),
  );

  /// `GET /widget/health`. Ne lève jamais : renvoie `false` si le service ne
  /// répond pas « healthy », l'état de connectivité n'étant pas une erreur.
  Future<bool> isHealthy() async {
    try {
      final data = await _send(
        () => _http.get(_uri('/widget/health'), headers: _tenantHeader),
        timeout: const Duration(seconds: 10),
      );
      return data['status'] == 'healthy';
    } on VoxoException {
      return false;
    }
  }

  Future<Map<String, dynamic>> _postConversation(
    String sessionId,
    String action,
    Map<String, dynamic> body,
  ) => _send(
    () => _http.post(
      _uri('/widget/conversation/${Uri.encodeComponent(sessionId)}/$action'),
      headers: _jsonHeaders,
      body: jsonEncode(body),
    ),
  );

  /// Exécute la requête, applique le délai maximal et traduit les défaillances
  /// de transport en [VoxoException] affichables.
  Future<Map<String, dynamic>> _send(
    Future<http.Response> Function() request, {
    Duration timeout = VoxoLimits.requestTimeout,
  }) async {
    try {
      final response = await request().timeout(timeout);
      return VoxoEnvelope.unwrap(
        response.statusCode,
        response.body,
        _config.locale,
      );
    } on TimeoutException {
      throw VoxoException.timeout(_config.locale);
    } on SocketException {
      throw VoxoException.network(_config.locale);
    } on http.ClientException {
      throw VoxoException.network(_config.locale);
    }
  }

  /// À appeler quand le SDK est mis au rebut. Ne ferme pas un client fourni par
  /// l'intégrateur : il ne nous appartient pas.
  void dispose() {
    if (_ownsClient) _http.close();
  }
}
