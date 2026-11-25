const { normalizeLocale } = require('../i18n/locale');

const DEFAULTS = Object.freeze({
  fr: { welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?', initialQuestions: [] },
  en: { welcomeMessage: 'Hello! How can I help you?', initialQuestions: [] },
});

function resolveLocalizedContent(chatbot = {}, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const localized = chatbot.localizedContent || {};
  const legacy = { welcomeMessage: chatbot.welcomeMessage, initialQuestions: chatbot.initialQuestions };
  const fallback = localized.fr || legacy;
  const selected = localized[locale] || fallback;
  return {
    locale,
    welcomeMessage: selected?.welcomeMessage || fallback?.welcomeMessage || DEFAULTS[locale].welcomeMessage,
    initialQuestions: selected?.initialQuestions || fallback?.initialQuestions || DEFAULTS[locale].initialQuestions,
  };
}

module.exports = { DEFAULTS, resolveLocalizedContent };
