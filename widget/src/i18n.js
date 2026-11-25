import { getLocalStorage, setLocalStorage } from './utils.js';

export const SUPPORTED_LOCALES = ['fr', 'en'];
const COMMON = {
  messages: 'Messages', messageLabel: 'Message', welcome: 'Bienvenue', retry: 'Réessayer'
};
const COPY = {
  fr: {
    ...COMMON,
    open: 'Ouvrir le chat', tagline: 'Une question ? Échangeons !', connecting: 'Connexion…',
    minimize: 'Réduire le panneau', close: 'Fermer le chat', conversation: 'Messages de la conversation',
    attach: 'Joindre un fichier', more: 'Plus d’actions', placeholder: 'Écrivez votre message…',
    send: 'Envoyer le message', powered: 'Propulsé par ', today: 'Aujourd’hui', yesterday: 'Hier',
    typing: 'L’assistant écrit…', language: 'Langue', defaultWelcome: 'Bonjour ! Comment puis-je vous aider ?',
    clear: 'Effacer la conversation', history: 'Historique des conversations', endAndRate: 'Terminer et évaluer',
    sending: 'Envoi en cours', answered: 'Traité par l’assistant', failed: 'Échec de l’envoi',
    copyResponse: 'Copier la réponse', useful: 'Réponse utile', notUseful: 'Réponse non utile',
    suggestions: 'Suggestions de messages', prechatTitle: 'Avant de commencer',
    prechatCopy: 'Indiquez vos coordonnées pour personnaliser la conversation.', fullName: 'Nom complet',
    email: 'Adresse e-mail', start: 'Démarrer la conversation', nameRequired: 'Renseignez votre nom complet.',
    emailInvalid: 'Saisissez une adresse e-mail valide.', ratingTitle: 'Comment s’est passée la conversation ?',
    ratingCopy: 'Votre avis aide à améliorer les prochaines réponses.', ratingGroup: 'Note sur cinq',
    star: '{count} étoile', stars: '{count} étoiles', optionalComment: 'Commentaire facultatif',
    commentPlaceholder: 'Dites-nous ce qui vous a aidé…', cancel: 'Annuler', sendRating: 'Envoyer mon avis',
    attachmentLimit: 'Vous pouvez joindre au maximum {count} fichiers.',
    attachmentRoom: 'Seuls {count} fichiers supplémentaires peuvent être joints.', uploadFailed: 'Envoi du fichier impossible.',
    uploadPending: 'Un fichier est encore en cours d’envoi.', rateLimited: 'Vous envoyez trop de messages. Patientez quelques instants.',
    tooLong: 'Message trop long (2 000 caractères maximum).', copyFailed: 'Impossible de copier la réponse.',
    feedbackFailed: 'Votre avis n’a pas pu être enregistré.', ratingRequired: 'Choisissez une note entre 1 et 5.',
    ratingThanks: 'Merci, votre avis a bien été envoyé.', ratingFailed: 'Impossible d’envoyer votre avis.',
    endFailed: 'Impossible de terminer la conversation.', closeFailed: 'Impossible de clôturer la conversation.',
    noHistory: 'Aucune conversation précédente.', agent: 'un conseiller', withAgent: 'Vous échangez avec {name}',
    agentNotified: 'Un conseiller a été prévenu',
    inactivityReminder: 'Bonjour, souhaitez-vous poursuivre notre échange ? Je reste à votre disposition.',
    inactivityClosed: 'Sans réponse de votre part, cette conversation est maintenant clôturée. Vous pourrez démarrer une nouvelle conversation à tout moment.',
    timeout: 'Le service met trop de temps à répondre. Veuillez réessayer.',
    network: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
    copied: 'Réponse copiée.', autoCloseFailed: 'La clôture automatique a échoué. Veuillez réessayer.',
    historyUnavailable: 'Historique indisponible', assistant: 'Assistant IA', available: 'Assistant disponible',
    unavailable: 'Service indisponible', technicalError: 'Une erreur technique est survenue.',
    authError: 'Problème d’authentification. Contactez l’administrateur.', denied: 'Accès refusé. Contactez l’administrateur.',
    serviceMissing: 'Service non trouvé. Contactez l’administrateur.', serverError: 'Erreur serveur temporaire. Réessayez dans quelques instants.',
    unexpected: 'Une erreur inattendue s’est produite. Veuillez réessayer.',
    expand: 'Développer le panneau', responseAnnouncement: 'Réponse de {name} : {text}',
    justNow: 'À l’instant', minutesAgo: '{count} min', hoursAgo: '{count} h', daysAgo: '{count} j',
    conversationLabel: 'Conversation',
    testGreeting: 'Bonjour !', testHowAreYou: 'Comment ça va ?', testHelpRequest: 'Pouvez-vous m’aider ?',
    testThanks: 'Merci beaucoup !', testGoodbye: 'À bientôt !'
  },
  en: {
    messages: 'Messages', messageLabel: 'Message', welcome: 'Welcome', retry: 'Retry',
    open: 'Open chat', tagline: 'Have a question? Let’s chat!', connecting: 'Connecting…',
    minimize: 'Minimize panel', close: 'Close chat', conversation: 'Conversation messages',
    attach: 'Attach a file', more: 'More actions', placeholder: 'Type your message…', send: 'Send message',
    powered: 'Powered by ', today: 'Today', yesterday: 'Yesterday', typing: 'The assistant is typing…',
    language: 'Language', defaultWelcome: 'Hello! How can I help you?', clear: 'Clear conversation',
    history: 'Conversation history', endAndRate: 'End and rate', sending: 'Sending', answered: 'Handled by the assistant',
    failed: 'Send failed', copyResponse: 'Copy response', useful: 'Helpful response', notUseful: 'Not helpful',
    suggestions: 'Message suggestions', prechatTitle: 'Before you start',
    prechatCopy: 'Share your details to personalize the chat.', fullName: 'Full name', email: 'Email address',
    start: 'Start conversation', nameRequired: 'Enter your full name.', emailInvalid: 'Enter a valid email address.',
    ratingTitle: 'How did the chat go?', ratingCopy: 'Your feedback improves our replies.',
    ratingGroup: 'Rating out of five', star: '{count} star', stars: '{count} stars', optionalComment: 'Optional comment',
    commentPlaceholder: 'Tell us what helped…', cancel: 'Cancel', sendRating: 'Send feedback',
    attachmentLimit: 'You can attach up to {count} files.', attachmentRoom: 'Only {count} more files can be attached.',
    uploadFailed: 'Unable to upload the file.', uploadPending: 'A file is still uploading.',
    rateLimited: 'You are sending too many messages. Please wait a moment.', tooLong: 'Message is too long (2,000 characters maximum).',
    copyFailed: 'Unable to copy the response.', feedbackFailed: 'Your feedback could not be saved.',
    ratingRequired: 'Choose a rating between 1 and 5.', ratingThanks: 'Thank you, your feedback was sent.',
    ratingFailed: 'Unable to send your feedback.', endFailed: 'Unable to end the conversation.',
    closeFailed: 'Unable to close the conversation.', noHistory: 'No previous conversations.', agent: 'an agent',
    withAgent: 'You are chatting with {name}', agentNotified: 'An agent has been notified',
    inactivityReminder: 'Would you like to continue?',
    inactivityClosed: 'Chat closed for inactivity. You can start a new one anytime.',
    timeout: 'The service is slow to respond. Try again.',
    network: 'Unable to connect. Check your network.',
    copied: 'Response copied.', autoCloseFailed: 'Automatic close failed. Try again.',
    historyUnavailable: 'History unavailable', assistant: 'AI assistant', available: 'Assistant available',
    unavailable: 'Service unavailable', technicalError: 'A technical error occurred.',
    authError: 'Authentication failed. Contact the administrator.', denied: 'Access denied. Contact the administrator.',
    serviceMissing: 'Service not found. Contact the administrator.', serverError: 'Temporary server error. Please try again shortly.',
    unexpected: 'Unexpected error. Try again.',
    expand: 'Expand panel', responseAnnouncement: 'Response from {name}: {text}',
    justNow: 'Just now', minutesAgo: '{count} min', hoursAgo: '{count} h', daysAgo: '{count} d',
    conversationLabel: 'Conversation',
    testGreeting: 'Hello!', testHowAreYou: 'How are you?', testHelpRequest: 'Can you help me?',
    testThanks: 'Thank you very much!', testGoodbye: 'See you soon!'
  }
};

export function normalizeLocale(value) {
  const locale = String(value || '').toLowerCase().split(/[-_,;]/)[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'fr';
}

export function resolveLocale(config = {}) {
  return normalizeLocale(config.locale || getLocalStorage(`locale-${config.tenantId}`) || navigator.language);
}

export function saveLocale(tenantId, locale) {
  setLocalStorage(`locale-${tenantId}`, normalizeLocale(locale));
}

export function translate(locale, key, values = {}) {
  const template = COPY[normalizeLocale(locale)][key] || COPY.fr[key] || key;
  return Object.entries(values).reduce(
    (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)), template
  );
}

export function assertCatalogParity() {
  const fr = Object.keys(COPY.fr).sort();
  const en = Object.keys(COPY.en).sort();
  return fr.length === en.length && fr.every((key, index) => key === en[index]);
}
