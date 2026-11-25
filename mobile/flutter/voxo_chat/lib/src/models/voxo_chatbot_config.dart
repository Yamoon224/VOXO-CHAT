import '../core/voxo_limits.dart';
import '../voxo_i18n.dart';

/// Fonctionnalités activées par le propriétaire du chatbot depuis son
/// dashboard. Le SDK les respecte : masquer un bouton ici, c'est refléter une
/// décision du client, pas une préférence de l'intégrateur.
class VoxoFeatures {
  const VoxoFeatures({
    this.messageFeedback = true,
    this.conversationRating = true,
    this.showTimestamps = true,
    this.showDeliveryStatus = true,
    this.dateSeparators = true,
    this.connectivityStatus = true,
    this.attachments = true,
    this.liveTypingPreview = false,
  });

  final bool messageFeedback;
  final bool conversationRating;
  final bool showTimestamps;
  final bool showDeliveryStatus;
  final bool dateSeparators;
  final bool connectivityStatus;
  final bool attachments;

  /// Aperçu de saisie visible du conseiller (voir `CONTRACT.md`). Désactivé par
  /// défaut : une donnée personnelle ne part que sur décision du propriétaire.
  final bool liveTypingPreview;

  factory VoxoFeatures.fromJson(Map<String, dynamic> json) => VoxoFeatures(
        messageFeedback: json['messageFeedback'] as bool? ?? true,
        conversationRating: json['conversationRating'] as bool? ?? true,
        showTimestamps: json['showTimestamps'] as bool? ?? true,
        showDeliveryStatus: json['showDeliveryStatus'] as bool? ?? true,
        dateSeparators: json['dateSeparators'] as bool? ?? true,
        connectivityStatus: json['connectivityStatus'] as bool? ?? true,
        attachments: json['attachments'] as bool? ?? true,
        liveTypingPreview: json['liveTypingPreview'] as bool? ?? false,
      );
}

/// Configuration distante renvoyée par `GET /widget/config`.
///
/// Toutes les clés de `options.ui` sont **optionnelles** côté backend : elles
/// n'apparaissent dans la réponse que si le propriétaire les a définies. Aucune
/// ne doit être présumée présente.
class VoxoChatbotConfig {
  const VoxoChatbotConfig({
    this.name = VoxoTexts.defaultAssistantName,
    this.welcomeMessage = VoxoTexts.defaultWelcome,
    this.primaryColor = '#3b82f6',
    this.textColor = '#333333',
    this.avatarUrl,
    this.launcherIconUrl,
    this.colorScheme,
    this.enableMarkdown = true,
    this.showPoweredBy = true,
    this.features = const VoxoFeatures(),
    this.maxAttachments = VoxoLimits.maxAttachmentsPerMessage,
    this.maxAttachmentBytes = 10 * 1024 * 1024,
  });

  final String name;
  final String welcomeMessage;
  final String primaryColor;
  final String textColor;
  final String? avatarUrl;
  final String? launcherIconUrl;

  /// `light` ou `dark` quand le propriétaire a forcé un mode. `null` = on suit
  /// le thème de l'application hôte.
  final String? colorScheme;

  final bool enableMarkdown;

  /// La mention « Propulsé par VOXO » disparaît quand le tenant a souscrit à la
  /// marque personnalisée (`features.customBranding`).
  final bool showPoweredBy;

  final VoxoFeatures features;

  /// Limites d'envoi telles que le serveur les annonce. Elles font foi sur les
  /// constantes locales de [VoxoLimits], qui ne sont qu'un repli.
  final int maxAttachments;
  final int maxAttachmentBytes;

  factory VoxoChatbotConfig.fromJson(
    Map<String, dynamic> json, {
    String locale = 'fr',
  }) {
    final theme = _map(json['theme']);
    final options = _map(json['options']);
    final ui = _map(options['ui']);
    final attachments = _map(options['attachments']);
    final tenantFeatures = _map(json['features']);

    return VoxoChatbotConfig(
      name: json['name'] as String? ?? VoxoTexts.defaultAssistantName,
      welcomeMessage: json['welcomeMessage'] as String? ??
          VoxoI18n.text(locale, 'defaultWelcome'),
      primaryColor: theme['primaryColor'] as String? ?? '#3b82f6',
      textColor: theme['textColor'] as String? ?? '#333333',
      avatarUrl: ui['avatarUrl'] as String?,
      launcherIconUrl: ui['launcherIconUrl'] as String?,
      colorScheme: ui['colorScheme'] as String?,
      enableMarkdown: options['enableMarkdown'] as bool? ?? true,
      showPoweredBy: !(tenantFeatures['customBranding'] as bool? ?? false),
      features: VoxoFeatures.fromJson(_map(options['features'])),
      maxAttachments: (attachments['maxFiles'] as num?)?.toInt() ??
          VoxoLimits.maxAttachmentsPerMessage,
      maxAttachmentBytes:
          (attachments['maxBytes'] as num?)?.toInt() ?? 10 * 1024 * 1024,
    );
  }

  static Map<String, dynamic> _map(Object? value) =>
      value is Map<String, dynamic> ? value : const <String, dynamic>{};
}
