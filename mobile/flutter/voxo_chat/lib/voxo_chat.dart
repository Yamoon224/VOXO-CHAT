/// SDK d'intégration VOXO Chat pour Flutter.
///
/// Deux couches, séparées à dessein :
/// - le **core** ([VoxoController] et ce qu'il expose) — réseau, session,
///   état ; utilisable seul pour construire son propre écran de chat ;
/// - l'**UI** prête à l'emploi, construite par-dessus.
///
/// Le contrat consommé côté serveur est figé dans `mobile/CONTRACT.md`.
///
/// ```dart
/// final voxo = VoxoController(
///   config: VoxoConfig(apiUrl: 'https://…/api', tenantId: '…'),
/// );
/// await voxo.init();
/// ```
///
/// Seuls les symboles réexportés ici forment le contrat public : tout ce qui
/// vit sous `src/` sans être listé est interne et peut changer.
library;

export 'src/core/voxo_config.dart' show VoxoConfig, VoxoOptions, VoxoUser;
export 'src/core/voxo_archived_view.dart' show VoxoArchivedView;
export 'src/core/voxo_controller.dart' show VoxoController;
export 'src/core/voxo_conversation_state.dart' show VoxoConnectivity;
export 'src/core/voxo_exception.dart' show VoxoException;
export 'src/core/voxo_limits.dart' show VoxoLimits;
export 'src/core/voxo_push_platform.dart' show VoxoPushPlatform;
export 'src/core/voxo_session_store.dart' show VoxoArchivedConversation;
export 'src/file_rules.dart' show VoxoFileRules, VoxoFileValidation;
export 'src/models/voxo_attachment.dart'
    show VoxoAttachment, VoxoAttachmentCategory, VoxoPendingAttachment;
export 'src/models/voxo_chatbot_config.dart'
    show VoxoChatbotConfig, VoxoFeatures;
export 'src/models/voxo_handoff.dart' show VoxoHandoff, VoxoHandoffStatus;
export 'src/models/voxo_message.dart'
    show VoxoDeliveryStatus, VoxoFeedback, VoxoMessage, VoxoRole;
export 'src/theme/voxo_theme.dart' show VoxoTheme, VoxoThemeScope;
export 'src/ui/voxo_chat_actions.dart' show VoxoChatActions;
export 'src/ui/voxo_chat_view.dart' show VoxoChatView;
export 'src/ui/voxo_date_labels.dart' show VoxoDateLabels;
export 'src/voxo_i18n.dart' show VoxoI18n;
export 'src/ui/voxo_launcher.dart' show VoxoLauncher;
