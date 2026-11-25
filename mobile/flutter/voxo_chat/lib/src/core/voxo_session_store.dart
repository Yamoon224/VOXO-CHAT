import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/voxo_message.dart';
import 'voxo_config.dart';
import 'voxo_limits.dart';
import 'voxo_uuid.dart';

/// Conversation terminée, gardée pour l'écran d'historique.
class VoxoArchivedConversation {
  const VoxoArchivedConversation({
    required this.sessionId,
    required this.title,
    required this.endedAt,
  });

  final String sessionId;
  final String title;
  final DateTime endedAt;

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'title': title,
        'endedAt': endedAt.toIso8601String(),
      };

  factory VoxoArchivedConversation.fromJson(Map<String, dynamic> json) =>
      VoxoArchivedConversation(
        sessionId: json['sessionId'] as String? ?? '',
        title: json['title'] as String? ?? 'Conversation',
        endedAt:
            DateTime.tryParse(json['endedAt'] as String? ?? '') ?? DateTime.now(),
      );
}

/// État de session restauré au démarrage.
class VoxoSessionSnapshot {
  const VoxoSessionSnapshot({
    required this.sessionId,
    required this.messages,
    required this.messageCount,
    required this.inactivityReminderCount,
    required this.sessionEnded,
    this.conversationStartedAt,
    this.user,
  });

  final String sessionId;
  final List<VoxoMessage> messages;
  final int messageCount;
  final int inactivityReminderCount;
  final bool sessionEnded;
  final DateTime? conversationStartedAt;
  final VoxoUser? user;
}

/// Persistance locale de la session.
///
/// Les clés reprennent celles du widget web (`session-{tenantId}`,
/// `conversation-history-{tenantId}`, `user-profile-{tenantId}`, `user-id`)
/// pour que le contrat reste lisible d'un canal à l'autre. Ce store ne fait
/// aucun appel réseau.
class VoxoSessionStore {
  VoxoSessionStore(this._config);

  final VoxoConfig _config;
  SharedPreferences? _prefs;

  String get _sessionKey => 'session-${_config.tenantId}';
  String get _historyKey => 'conversation-history-${_config.tenantId}';
  String get _profileKey => 'user-profile-${_config.tenantId}';
  static const String _userIdKey = 'user-id';

  Future<SharedPreferences> get _preferences async =>
      _prefs ??= await SharedPreferences.getInstance();

  /// Identifiant anonyme stable, généré une fois puis conservé. Un
  /// `externalId` fourni par l'application hôte le remplace.
  Future<String> userId() async {
    final external = _config.user?.externalId;
    if (external != null && external.isNotEmpty) return external;

    final prefs = await _preferences;
    final existing = prefs.getString(_userIdKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final generated = 'user-${VoxoUuid.v4()}';
    await prefs.setString(_userIdKey, generated);
    return generated;
  }

  Future<void> save({
    required String sessionId,
    required List<VoxoMessage> messages,
    required int messageCount,
    required int inactivityReminderCount,
    required bool sessionEnded,
    DateTime? conversationStartedAt,
    VoxoUser? user,
  }) async {
    if (!_config.options.persistSession) return;
    final prefs = await _preferences;
    await prefs.setString(
      _sessionKey,
      jsonEncode({
        'sessionId': sessionId,
        // Seuls les derniers messages sont persistés : au-delà, le fil se
        // recharge depuis le serveur.
        'messages': messages
            .skip(
              messages.length > VoxoLimits.maxPersistedMessages
                  ? messages.length - VoxoLimits.maxPersistedMessages
                  : 0,
            )
            .map((message) => message.toJson())
            .toList(),
        'lastActivity': DateTime.now().millisecondsSinceEpoch,
        'conversationStartedAt': conversationStartedAt?.toIso8601String(),
        'messageCount': messageCount,
        'inactivityReminderCount': inactivityReminderCount,
        'sessionEnded': sessionEnded,
        'user': user?.toJson(),
      }),
    );
  }

  /// Restaure la session si elle est encore fraîche. Au-delà de 30 minutes
  /// d'inactivité, elle est archivée et `null` est renvoyé : l'utilisateur
  /// repart sur une conversation neuve.
  Future<VoxoSessionSnapshot?> restore() async {
    if (!_config.options.persistSession) return null;
    final prefs = await _preferences;
    final raw = prefs.getString(_sessionKey);
    if (raw == null) return null;

    final decoded = _decodeMap(raw);
    final lastActivity = (decoded?['lastActivity'] as num?)?.toInt();
    if (decoded == null || lastActivity == null) return null;

    final messages = (decoded['messages'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map(VoxoMessage.fromJson)
            .toList() ??
        <VoxoMessage>[];

    final age = DateTime.now().millisecondsSinceEpoch - lastActivity;
    if (age >= VoxoLimits.sessionTimeout.inMilliseconds) {
      await archive(decoded['sessionId'] as String?, messages);
      await prefs.remove(_sessionKey);
      return null;
    }

    return VoxoSessionSnapshot(
      sessionId: decoded['sessionId'] as String? ?? VoxoUuid.v4(),
      messages: messages,
      messageCount: (decoded['messageCount'] as num?)?.toInt() ?? 0,
      inactivityReminderCount:
          (decoded['inactivityReminderCount'] as num?)?.toInt() ?? 0,
      sessionEnded: decoded['sessionEnded'] as bool? ?? false,
      conversationStartedAt:
          DateTime.tryParse(decoded['conversationStartedAt'] as String? ?? ''),
      user: VoxoUser.fromJson(decoded['user'] as Map<String, dynamic>?),
    );
  }

  Future<void> clearSession() async {
    final prefs = await _preferences;
    await prefs.remove(_sessionKey);
  }

  /// Range une conversation dans l'historique local. Sans message, il n'y a
  /// rien à archiver.
  Future<void> archive(String? sessionId, List<VoxoMessage> messages) async {
    if (sessionId == null || sessionId.isEmpty || messages.isEmpty) return;

    // Le premier message de l'utilisateur sert de titre, comme dans le widget.
    final firstUserMessages = messages
        .where((message) => message.isFromUser && message.text.isNotEmpty)
        .map((message) => message.text)
        .take(1)
        .toList();
    final title =
        firstUserMessages.isEmpty ? 'Conversation' : firstUserMessages.first;

    final entries = await history();
    entries.removeWhere((item) => item.sessionId == sessionId);
    entries.insert(
      0,
      VoxoArchivedConversation(
        sessionId: sessionId,
        title: title.length > 80 ? title.substring(0, 80) : title,
        endedAt: DateTime.now(),
      ),
    );

    final prefs = await _preferences;
    await prefs.setString(
      _historyKey,
      jsonEncode(
        entries
            .take(VoxoLimits.maxArchivedConversations)
            .map((item) => item.toJson())
            .toList(),
      ),
    );
  }

  /// Historique local, purgé des conversations de plus de 30 jours.
  Future<List<VoxoArchivedConversation>> history() async {
    final prefs = await _preferences;
    final raw = prefs.getString(_historyKey);
    if (raw == null) return [];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];

    final cutoff = DateTime.now().subtract(VoxoLimits.historyRetention);
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(VoxoArchivedConversation.fromJson)
        .where((item) => item.endedAt.isAfter(cutoff))
        .toList();
  }

  Future<void> saveUser(VoxoUser user) async {
    final prefs = await _preferences;
    await prefs.setString(_profileKey, jsonEncode(user.toJson()));
  }

  Future<VoxoUser?> restoreUser() async {
    if (_config.user != null && !_config.user!.isEmpty) return _config.user;
    final prefs = await _preferences;
    final raw = prefs.getString(_profileKey);
    return raw == null ? null : VoxoUser.fromJson(_decodeMap(raw));
  }

  Map<String, dynamic>? _decodeMap(String raw) {
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, dynamic> ? decoded : null;
    } on FormatException {
      return null;
    }
  }
}
