// src/services/chatbotSettingsService.js
// Validation et fusion des paramètres publics du chatbot (Tenant.settings.chatbot).
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');
const openaiService = require('./openaiService');
const { TONE_VALUES, MAX_CUSTOM_INSTRUCTIONS_LENGTH, normalizeCustomInstructions } = require('./chatPromptBuilder');
const { computeTenantFeatures } = require('./tenantFeatureFlags');

const MAX_NAME_LENGTH = 100;
const MAX_WELCOME_LENGTH = 500;
const MAX_INITIAL_QUESTIONS = 5;
const VALID_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
const HEX_COLOR = /^#[0-9A-F]{6}$/i;

// Drapeaux booléens exposés au widget par GET /widget/config.
// Liste blanche stricte : sans elle, n'importe quel JSON entrerait dans
// Tenant.settings.chatbot.options.
const OPTION_FEATURES = [
  'messageFeedback',
  'conversationRating',
  'showTimestamps',
  'showDeliveryStatus',
  'dateSeparators',
  'connectivityStatus',
  'attachments',
  'liveTypingPreview',
  'agentActions',
];
const BOT_AVATAR_PRESETS = ['orbit', 'lumen', 'nova', 'pulse', 'cosmos', 'flux'];

class ChatbotSettingsService {
  validate({ name, welcomeMessage, localizedContent, tone, theme, options, customInstructions }) {
    if (name && (typeof name !== 'string' || name.length > MAX_NAME_LENGTH)) {
      throw new AppError('Nom du chatbot invalide', 400, { code: 'CHATBOT_NAME_INVALID' });
    }

    if (welcomeMessage
      && (typeof welcomeMessage !== 'string' || welcomeMessage.length > MAX_WELCOME_LENGTH)) {
      throw new AppError("Message d'accueil trop long", 400, { code: 'CHATBOT_WELCOME_MESSAGE_TOO_LONG' });
    }

    for (const locale of ['fr', 'en']) {
      const content = localizedContent?.[locale];
      if (!content) continue;
      // Les messages ci-dessous nomment la langue concernée (FR/EN) : valeur
      // dynamique que MESSAGES[code], une chaîne plate, ne peut pas porter.
      // Texte résolu ici (cf. dynamicMessage, src/i18n/messages.js).
      if (typeof content.welcomeMessage !== 'string'
        || content.welcomeMessage.length > MAX_WELCOME_LENGTH) {
        throw new AppError(
          dynamicMessage({
            fr: `Message d'accueil ${locale.toUpperCase()} invalide`,
            en: `Invalid ${locale.toUpperCase()} welcome message`,
          }),
          400,
          { code: 'INVALID_LOCALIZED_WELCOME_MESSAGE', preTranslated: true }
        );
      }
      if (!Array.isArray(content.initialQuestions)
        || content.initialQuestions.length > MAX_INITIAL_QUESTIONS
        || content.initialQuestions.some(question => typeof question !== 'string')) {
        throw new AppError(
          dynamicMessage({
            fr: `Suggestions ${locale.toUpperCase()} invalides`,
            en: `Invalid ${locale.toUpperCase()} suggestions`,
          }),
          400,
          { code: 'INVALID_LOCALIZED_INITIAL_QUESTIONS', preTranslated: true }
        );
      }
    }

    if (tone && !TONE_VALUES.includes(tone)) {
      throw new AppError('Ton du chatbot invalide', 400, { code: 'CHATBOT_TONE_INVALID' });
    }

    if (customInstructions !== undefined) {
      if (typeof customInstructions !== 'string') {
        throw new AppError('Les instructions IA doivent etre du texte', 400, { code: 'CUSTOM_INSTRUCTIONS_INVALID_TYPE' });
      }
      if (normalizeCustomInstructions(customInstructions).length > MAX_CUSTOM_INSTRUCTIONS_LENGTH) {
        // Limite interpolée : texte résolu ici (cf. dynamicMessage).
        throw new AppError(
          dynamicMessage({
            fr: `Les instructions IA ne peuvent pas depasser ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} caracteres`,
            en: `AI instructions cannot exceed ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters`,
          }),
          400,
          { code: 'CUSTOM_INSTRUCTIONS_TOO_LONG', preTranslated: true }
        );
      }
    }

    if (theme?.primaryColor && !HEX_COLOR.test(theme.primaryColor)) {
      throw new AppError('Couleur primaire invalide', 400, { code: 'CHATBOT_PRIMARY_COLOR_INVALID' });
    }

    if (theme?.position && !VALID_POSITIONS.includes(theme.position)) {
      throw new AppError('Position invalide', 400, { code: 'CHATBOT_POSITION_INVALID' });
    }

    for (const [key, value] of Object.entries(options?.features || {})) {
      // Nom de l'option interpolé : texte résolu ici (cf. dynamicMessage).
      if (!OPTION_FEATURES.includes(key)) {
        throw new AppError(
          dynamicMessage({
            fr: `Option de chatbot inconnue : ${key}`,
            en: `Unknown chatbot option: ${key}`,
          }),
          400,
          { code: 'CHATBOT_OPTION_UNKNOWN', preTranslated: true }
        );
      }
      if (typeof value !== 'boolean') {
        throw new AppError(
          dynamicMessage({
            fr: `L'option « ${key} » doit être un booléen`,
            en: `The "${key}" option must be a boolean`,
          }),
          400,
          { code: 'CHATBOT_OPTION_NOT_BOOLEAN', preTranslated: true }
        );
      }
    }
    if (options?.ui?.avatarPreset !== undefined && !BOT_AVATAR_PRESETS.includes(options.ui.avatarPreset)) {
      throw new AppError('Avatar de robot invalide', 400, { code: 'CHATBOT_AVATAR_INVALID' });
    }
  }

  /** Ne retient que les drapeaux connus, et seulement s'ils sont fournis. */
  mergeOptions(currentOptions = {}, options = {}) {
    if (!options.features && options.ui?.avatarPreset === undefined) return currentOptions;

    const features = { ...currentOptions.features };
    OPTION_FEATURES.forEach(key => { if (key in (options.features || {})) features[key] = options.features[key]; });

    return {
      ...currentOptions,
      ...(options.features ? { features } : {}),
      ...(options.ui?.avatarPreset !== undefined ? {
        ui: { ...currentOptions.ui, avatarPreset: options.ui.avatarPreset },
      } : {}),
    };
  }

  hasQuestionsChanged(tenant, initialQuestions) {
    const current = tenant.settings?.chatbot?.initialQuestions || [];
    return initialQuestions !== undefined
      && JSON.stringify(initialQuestions) !== JSON.stringify(current);
  }

  // Validation IA uniquement lorsque les suggestions ont réellement changé.
  async collectSuggestionWarnings(tenant, initialQuestions) {
    const shouldValidate = this.hasQuestionsChanged(tenant, initialQuestions)
      && Array.isArray(initialQuestions)
      && initialQuestions.length > 0;

    if (!shouldValidate) {
      return [];
    }

    if (initialQuestions.length > MAX_INITIAL_QUESTIONS) {
      throw new AppError('Vous ne pouvez pas proposer plus de 5 suggestions.', 400, { code: 'INITIAL_QUESTIONS_LIMIT' });
    }

    const validation = await openaiService.validateOwnerSuggestions(initialQuestions, tenant.id);
    if (validation.isValid) {
      return [];
    }

    return [{
      code: 'INITIAL_QUESTIONS_NOT_COVERED',
      message: validation.reason
        || "La base de connaissances ne permet pas encore de répondre à toutes ces suggestions.",
    }];
  }

  mergeChatbotSettings(currentSettings, body) {
    const { name, welcomeMessage, localizedContent, tone, theme, features, options, initialQuestions, customInstructions } = body;

    return {
      ...currentSettings.chatbot,
      ...(name && { name }),
      ...(welcomeMessage && { welcomeMessage }),
      ...(localizedContent && {
        localizedContent: { ...currentSettings.chatbot?.localizedContent, ...localizedContent },
      }),
      ...(tone && { tone }),
      ...(theme && { theme: { ...currentSettings.chatbot?.theme, ...theme } }),
      ...(features && { features: { ...currentSettings.chatbot?.features, ...features } }),
      ...(options && { options: this.mergeOptions(currentSettings.chatbot?.options, options) }),
      ...(initialQuestions && { initialQuestions }),
      ...(customInstructions !== undefined && { customInstructions: normalizeCustomInstructions(customInstructions) }),
    };
  }

  async update(tenant, body) {
    this.validate(body);

    if (body.customInstructions !== undefined) {
      const features = await computeTenantFeatures(tenant);
      if (features.customAiInstructions !== true) {
        throw new AppError('Les instructions IA personnalisees ne sont pas incluses dans votre forfait', 403, {
          code: 'PLAN_FEATURE_REQUIRED',
        });
      }
    }

    const warnings = await this.collectSuggestionWarnings(tenant, body.initialQuestions);
    const currentSettings = tenant.settings || {};
    const chatbot = this.mergeChatbotSettings(currentSettings, body);

    await tenant.update({ settings: { ...currentSettings, chatbot } });

    return { chatbot, warnings };
  }
}

module.exports = new ChatbotSettingsService();
