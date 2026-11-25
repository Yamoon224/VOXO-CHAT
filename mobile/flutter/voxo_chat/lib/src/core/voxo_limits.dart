import '../voxo_i18n.dart';

/// Miroir client des limites imposées par le backend widget.
///
/// Ces valeurs ne sont **pas** une invention du SDK : elles reproduisent
/// `backend/src/validators/widgetMessageValidator.js`,
/// `backend/src/routes/widgetRoutes.js` et `widget/src/widget.js`. Toute
/// révision se reporte dans `mobile/CONTRACT.md` et dans les quatre SDK.
///
/// Les valider côté client évite un aller-retour réseau garanti perdant et
/// permet d'afficher un message utile avant l'envoi.
abstract final class VoxoLimits {
  /// Longueur maximale d'un message. Au-delà : `400 MESSAGE_TOO_LONG`.
  static const int maxMessageLength = 2000;

  /// Pièces jointes par message. Au-delà : `400 TOO_MANY_ATTACHMENTS`.
  static const int maxAttachmentsPerMessage = 3;

  /// Longueur du commentaire de notation. Au-delà : `400 INVALID_FEEDBACK`.
  static const int maxFeedbackLength = 1000;

  /// Messages par minute acceptés par le serveur, en fenêtre glissante.
  static const int messagesPerMinute = 15;
  static const Duration rateLimitWindow = Duration(minutes: 1);

  /// Délais réseau. L'upload extrait le contenu du fichier côté serveur, d'où
  /// une fenêtre bien plus large que les 30 s par défaut.
  static const Duration requestTimeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(minutes: 2);

  /// Silence toléré avant le premier rappel d'inactivité.
  static const Duration inactivityDelay = Duration(minutes: 10);

  /// Nombre de relances avant `POST /widget/conversation/:sessionId/timeout`.
  static const int maxInactivityReminders = 3;

  /// Cadence de vérification de l'inactivité.
  static const Duration inactivityTick = Duration(minutes: 1);

  /// Au-delà, la session locale est archivée plutôt que restaurée.
  static const Duration sessionTimeout = Duration(minutes: 30);

  /// Messages conservés en mémoire, et sous-ensemble réellement persisté.
  static const int maxMessagesInMemory = 100;
  static const int maxPersistedMessages = 50;

  /// Rétention de l'historique local des conversations terminées.
  static const Duration historyRetention = Duration(days: 30);
  static const int maxArchivedConversations = 30;

  /// Reconnexion du WebSocket : `min(1000 × 2^tentative, 15000)` ms.
  static const Duration socketReconnectBase = Duration(seconds: 1);
  static const Duration socketReconnectMax = Duration(seconds: 15);

  /// Intervalle minimal entre deux sondes `GET /widget/health`.
  static const Duration healthCheckInterval = Duration(seconds: 55);
}

/// Textes de relance d'inactivité, alignés mot pour mot sur le widget web
/// (`widget/src/widget.js`) pour que l'expérience soit identique sur tous les
/// canaux. Résolus dans la langue de la conversation via [VoxoI18n].
abstract final class VoxoTexts {
  static String inactivityReminder(String locale) =>
      VoxoI18n.text(locale, 'inactivityReminder');

  static String inactivityClosing(String locale) =>
      VoxoI18n.text(locale, 'inactivityClosing');

  /// Repli constant (français) utilisé comme valeur par défaut de
  /// [VoxoChatbotConfig.welcomeMessage] — un paramètre par défaut doit être
  /// une constante de compilation, donc sans locale. Les points d'entrée qui
  /// connaissent la locale (`VoxoChatbotConfig.fromJson`,
  /// `VoxoConversationSync.loadConfig`) résolvent plutôt via
  /// `VoxoI18n.text(locale, 'defaultWelcome')`.
  static const String defaultWelcome = 'Bonjour ! Comment puis-je vous aider ?';
  static const String defaultAssistantName = 'Assistant';
}
