import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:voxo_chat/src/core/voxo_api_client.dart';
import 'package:voxo_chat/src/core/voxo_socket.dart';
import 'package:voxo_chat/voxo_chat.dart';

import 'fake_backend.dart';

const tenantId = '9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d';
const apiUrl = 'https://api.voxo.test/api';

/// Motif du validateur backend, recopié depuis
/// `backend/src/validators/widgetMessageValidator.js`.
final uuidV4 = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);

/// Extrait le `clientMessageId` d'un corps de requête.
String? clientMessageIdOf(http.Request request) =>
    RegExp(r'"clientMessageId":"([^"]+)"').firstMatch(request.body)?.group(1);

/// Monte un controller branché sur le backend et le socket simulés.
///
/// La surveillance d'inactivité est coupée par défaut : elle poserait un timer
/// périodique qui survivrait au test. Elle a son propre jeu de tests.
VoxoController buildController({
  required FakeBackend backend,
  required FakeWebSocketChannel channel,
  VoxoOptions? options,
  http.Client? httpClient,
}) {
  final config = VoxoConfig(
    apiUrl: apiUrl,
    tenantId: tenantId,
    user: const VoxoUser(name: 'Awa', email: 'awa@example.com'),
    options: options ?? const VoxoOptions(enableInactivityMonitor: false),
  );
  return VoxoController(
    config: config,
    apiClient: VoxoApiClient(config, httpClient: httpClient ?? backend.client),
    socket: VoxoSocket(config, connector: (_) => channel),
  );
}

/// Client qui échoue systématiquement, pour éprouver les chemins hors ligne.
class DeadClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) =>
      Future.error(const SocketException('hors ligne'));
}
