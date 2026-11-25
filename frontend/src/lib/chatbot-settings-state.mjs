import { mergeChatbotOptions, normalizeChatbotOptions } from './chatbot-options.mjs'

export function createDefaultChatbotSettings() {
  return {
    name: 'Assistant',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    tone: 'chaleureux',
    customInstructions: '',
    initialQuestions: [],
    localizedContent: {
      fr: { welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?', initialQuestions: [] },
      en: { welcomeMessage: 'Hello! How can I help you?', initialQuestions: [] }
    },
    theme: {
      primaryColor: '#3b82f6',
      textColor: '#333333',
      position: 'bottom-right'
    },
    features: {
      leadGeneration: false,
      analytics: true,
      customBranding: false,
      autoResponseSuggestions: true,
      conversationRating: true,
      offlineMode: false
    },
    options: normalizeChatbotOptions(),
    advanced: {
      maxMessageLength: 2000,
      typingIndicator: true,
      readReceipts: false,
      messageHistory: 50,
      sessionTimeout: 30,
      rateLimiting: { enabled: true, messagesPerMinute: 15 }
    }
  }
}

export function normalizeChatbotSettings(settings = {}) {
  const defaults = createDefaultChatbotSettings()
  const legacyFrench = {
    welcomeMessage: settings.welcomeMessage || defaults.welcomeMessage,
    initialQuestions: settings.initialQuestions || []
  }
  return {
    ...defaults,
    ...settings,
    initialQuestions: settings.initialQuestions || defaults.initialQuestions,
    localizedContent: {
      fr: { ...defaults.localizedContent.fr, ...legacyFrench, ...settings.localizedContent?.fr },
      en: { ...defaults.localizedContent.en, ...settings.localizedContent?.en }
    },
    customInstructions: typeof settings.customInstructions === 'string' ? settings.customInstructions : '',
    theme: { ...defaults.theme, ...settings.theme },
    features: { ...defaults.features, ...settings.features },
    options: normalizeChatbotOptions(settings.options),
    advanced: {
      ...defaults.advanced,
      ...settings.advanced,
      rateLimiting: {
        ...defaults.advanced.rateLimiting,
        ...settings.advanced?.rateLimiting
      }
    }
  }
}

export function mergeImportedSettings(current, imported) {
  return normalizeChatbotSettings({
    ...current,
    ...imported,
    theme: { ...current.theme, ...imported.theme },
    features: { ...current.features, ...imported.features },
    options: mergeChatbotOptions(current.options, imported.options),
    advanced: {
      ...current.advanced,
      ...imported.advanced,
      rateLimiting: {
        ...current.advanced.rateLimiting,
        ...imported.advanced?.rateLimiting
      }
    }
  })
}

export function validateChatbotSettings(settings) {
  const errors = []
  if (!settings.name || typeof settings.name !== 'string' || !settings.name.trim()) {
    errors.push('Le nom du chatbot est requis')
  } else if (settings.name.length > 50) {
    errors.push('Le nom du chatbot ne peut pas dépasser 50 caractères')
  }
  if (!settings.welcomeMessage || typeof settings.welcomeMessage !== 'string') {
    errors.push('Le message d’accueil est requis')
  } else if (settings.welcomeMessage.length > 200) {
    errors.push('Le message d’accueil ne peut pas dépasser 200 caractères')
  }
  for (const locale of ['fr', 'en']) {
    const content = settings.localizedContent?.[locale]
    if (!content?.welcomeMessage || content.welcomeMessage.length > 500) {
      errors.push(`Le message d’accueil ${locale.toUpperCase()} est invalide`)
    }
    if (!Array.isArray(content?.initialQuestions) || content.initialQuestions.length > 5) {
      errors.push(`Les suggestions ${locale.toUpperCase()} sont invalides`)
    }
  }
  if (!/^#[0-9a-f]{6}$/i.test(settings.theme?.primaryColor || '')) {
    errors.push('La couleur principale doit être une couleur valide')
  }
  if (!['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(settings.theme?.position)) {
    errors.push('La position du widget doit être valide')
  }
  if (settings.advanced?.maxMessageLength > 5000) {
    errors.push('La longueur maximale de message ne peut pas dépasser 5000 caractères')
  }
  if (settings.advanced?.sessionTimeout > 120) {
    errors.push('Le timeout de session ne peut pas dépasser 120 minutes')
  }
  if ((settings.customInstructions || '').length > 2000) {
    errors.push('Les instructions IA ne peuvent pas depasser 2000 caracteres')
  }
  return { isValid: errors.length === 0, errors }
}

export function getChatbotChanges(settings, previous) {
  const changes = []
  if (settings.name !== previous.name) changes.push(`Nom: "${previous.name}" → "${settings.name}"`)
  if (settings.welcomeMessage !== previous.welcomeMessage) changes.push('Message d’accueil modifié')
  if (settings.theme.primaryColor !== previous.theme.primaryColor) {
    changes.push(`Couleur: ${previous.theme.primaryColor} → ${settings.theme.primaryColor}`)
  }
  return changes
}
