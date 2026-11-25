/**
 * Miroir client des limites imposées par le backend widget.
 *
 * Ces valeurs ne sont **pas** une invention du SDK : elles reproduisent
 * `backend/src/validators/widgetMessageValidator.js`,
 * `backend/src/routes/widgetRoutes.js` et `widget/src/widget.js`. Toute
 * révision se reporte dans `mobile/CONTRACT.md` et dans les quatre SDK.
 *
 * Les valider côté client évite un aller-retour réseau garanti perdant et
 * permet d'afficher un message utile avant l'envoi.
 */
export const VoxoLimits = {
  /** Longueur maximale d'un message. Au-delà : `400 MESSAGE_TOO_LONG`. */
  maxMessageLength: 2000,

  /** Pièces jointes par message. Au-delà : `400 TOO_MANY_ATTACHMENTS`. */
  maxAttachmentsPerMessage: 3,

  /** Longueur du commentaire de notation. Au-delà : `400 INVALID_FEEDBACK`. */
  maxFeedbackLength: 1000,

  /** Messages par minute acceptés par le serveur, en fenêtre glissante. */
  messagesPerMinute: 15,
  rateLimitWindowMs: 60_000,

  /**
   * Délais réseau. L'upload extrait le contenu du fichier côté serveur, d'où
   * une fenêtre bien plus large que les 30 s par défaut.
   */
  requestTimeoutMs: 30_000,
  uploadTimeoutMs: 120_000,

  /** Silence toléré avant le premier rappel d'inactivité. */
  inactivityDelayMs: 10 * 60_000,

  /** Nombre de relances avant `POST /widget/conversation/:sessionId/timeout`. */
  maxInactivityReminders: 3,

  /** Cadence de vérification de l'inactivité. */
  inactivityTickMs: 60_000,

  /** Au-delà, la session locale est archivée plutôt que restaurée. */
  sessionTimeoutMs: 30 * 60_000,

  /** Messages conservés en mémoire, et sous-ensemble réellement persisté. */
  maxMessagesInMemory: 100,
  maxPersistedMessages: 50,

  /** Rétention de l'historique local des conversations terminées. */
  historyRetentionMs: 30 * 24 * 60 * 60_000,
  maxArchivedConversations: 30,

  /** Reconnexion du WebSocket : `min(1000 × 2^tentative, 15000)` ms. */
  socketReconnectBaseMs: 1_000,
  socketReconnectMaxMs: 15_000,

  /** Intervalle minimal entre deux sondes `GET /widget/health`. */
  healthCheckIntervalMs: 55_000,
} as const

/**
 * Textes de relance d'inactivité, alignés mot pour mot sur le widget web
 * (`widget/src/widget.js`) pour que l'expérience soit identique sur tous les
 * canaux.
 */
export const VoxoTexts = {
  inactivityReminder:
    'Bonjour, souhaitez-vous poursuivre notre échange ? Je reste à votre disposition.',

  inactivityClosing:
    'Sans réponse de votre part, cette conversation est maintenant clôturée. ' +
    'Vous pourrez démarrer une nouvelle conversation à tout moment.',

  defaultWelcome: 'Bonjour ! Comment puis-je vous aider ?',
  defaultAssistantName: 'Assistant',
} as const
