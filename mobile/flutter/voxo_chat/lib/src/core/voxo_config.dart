import 'voxo_exception.dart';
import 'voxo_uuid.dart';
import '../voxo_i18n.dart';

/// Identité de l'utilisateur, quand l'application hôte la connaît déjà.
///
/// Fournie, elle évite le formulaire de pré-chat : c'est le cas courant dans une
/// application mobile où l'utilisateur est authentifié.
class VoxoUser {
  const VoxoUser({this.name, this.email, this.externalId});

  final String? name;
  final String? email;

  /// Identifiant stable côté application hôte. À défaut, le SDK génère et
  /// persiste un identifiant anonyme.
  final String? externalId;

  bool get isEmpty => name == null && email == null && externalId == null;

  Map<String, dynamic> toJson() => {
    if (name != null) 'name': name,
    if (email != null) 'email': email,
    if (externalId != null) 'externalId': externalId,
  };

  static VoxoUser? fromJson(Map<String, dynamic>? json) => json == null
      ? null
      : VoxoUser(
          name: json['name'] as String?,
          email: json['email'] as String?,
          externalId: json['externalId'] as String?,
        );
}

/// Réglages locaux du SDK. Tout ce qui relève de l'apparence et des
/// fonctionnalités activées vient de `GET /widget/config`, décidé par le
/// propriétaire du chatbot depuis son dashboard : on ne le duplique pas ici.
class VoxoOptions {
  const VoxoOptions({
    this.enableTyping = true,
    this.enableInactivityMonitor = true,
    this.persistSession = true,
    this.debug = false,
    this.showLanguageSwitcher = true,
    this.enableLiveTyping = true,
  });

  /// Indicateur « en train d'écrire » pendant l'attente de la réponse.
  final bool enableTyping;

  /// Relances puis clôture automatique après 10 minutes de silence. À couper si
  /// l'application gère elle-même le cycle de vie de la conversation.
  final bool enableInactivityMonitor;

  /// Restauration de la conversation au redémarrage de l'application.
  final bool persistSession;

  /// Journalise les échanges réseau. À laisser à `false` en production.
  final bool debug;
  final bool showLanguageSwitcher;

  /// Aperçu de saisie côté conseiller. N'envoie rien tant que le propriétaire
  /// n'a pas activé `features.liveTypingPreview` ET qu'un conseiller a pris la
  /// main ; mettre `false` l'interdit définitivement dans cette application.
  final bool enableLiveTyping;
}

/// Configuration d'initialisation du SDK.
///
/// [apiUrl] et [tenantId] sont fournis par l'intégrateur — ils figurent dans
/// l'onglet Intégration du dashboard VOXO. Le `tenantId` n'est pas un secret :
/// il est déjà public dans le `<script>` du widget web. Aucun autre secret ne
/// doit transiter par une application cliente.
class VoxoConfig {
  VoxoConfig({
    required String apiUrl,
    required this.tenantId,
    this.user,
    this.options = const VoxoOptions(),
    String? locale,
    String? appId,
  }) : locale = _normalizeLocale(locale),
       appId = _normalizeAppId(appId),
       apiUrl = _normalizeApiUrl(apiUrl, _normalizeLocale(locale)) {
    if (!VoxoUuid.isValid(tenantId)) {
      throw VoxoException(
        VoxoI18n.text(this.locale, 'invalidTenant'),
        code: 'INVALID_CONFIG',
      );
    }
  }

  /// Racine de l'API, terminée par `/api` et **sans** barre oblique finale.
  /// Exemple : `https://api.voxo.chat/api`.
  final String apiUrl;

  /// UUID v4 du tenant. Envoyé en header `X-Tenant-ID` sur chaque requête.
  final String tenantId;

  final VoxoUser? user;
  final VoxoOptions options;
  String locale;

  /// Identifiant de l'application hôte (*package name* Android, *bundle
  /// identifier* iOS), envoyé en `X-App-Id` (REST) et `appId` (WebSocket) quand
  /// il est renseigné. Flutter n'a pas de détection native sans dépendance :
  /// l'application hôte le fournit, par exemple via `package_info_plus`
  /// (`PackageInfo.fromPlatform().packageName`). Déclaratif, pas un secret.
  final String? appId;

  static String? _normalizeAppId(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }

  /// Normalise vers `'fr'` ou `'en'` uniquement — toute autre valeur, ou son
  /// absence, retombe sur `'fr'`. Un appelant qui ne fournit pas [locale] doit
  /// obtenir exactement le même comportement qu'avant l'introduction du
  /// bilinguisme : c'est le contrat de compatibilité du SDK, pas de
  /// détection automatique de la langue de l'appareil.
  static String _normalizeLocale(String? value) =>
      value?.toLowerCase() == 'en' ? 'en' : 'fr';

  /// URL du flux temps réel de la conversation.
  ///
  /// Le schéma HTTP est remplacé par son équivalent WebSocket, et
  /// l'autorisation passe par le paramètre `tenantId` : le handshake WebSocket
  /// ne transporte pas de header `X-Tenant-ID`.
  Uri conversationSocketUri(String sessionId) {
    final base = Uri.parse(apiUrl);
    return base.replace(
      scheme: base.scheme == 'https' ? 'wss' : 'ws',
      // Passer par les segments plutôt que par une interpolation : c'est ce qui
      // encode le sessionId au lieu de le laisser ouvrir un segment de chemin.
      pathSegments: [
        ...base.pathSegments,
        'widget',
        'conversation',
        sessionId,
        'socket',
      ],
      queryParameters: {'tenantId': tenantId, 'appId': ?appId},
    );
  }

  static String _normalizeApiUrl(String value, [String locale = 'fr']) {
    final trimmed = value.trim();
    final uri = Uri.tryParse(trimmed);
    if (trimmed.isEmpty ||
        uri == null ||
        !uri.hasScheme ||
        !uri.hasAuthority ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      throw VoxoException(
        VoxoI18n.text(locale, 'invalidApiUrl'),
        code: 'INVALID_CONFIG',
      );
    }
    // Reconstruit plutôt que `replace(query: null)` : sur `Uri.replace`, un
    // argument nul veut dire « garde l'existant », ce qui laisserait passer une
    // query ou un fragment collés par l'intégrateur.
    return Uri(
      scheme: uri.scheme,
      userInfo: uri.userInfo,
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
      path: uri.path.replaceAll(RegExp(r'/+$'), ''),
    ).toString();
  }
}
