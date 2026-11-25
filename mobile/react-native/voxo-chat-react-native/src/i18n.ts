export type VoxoLocale = 'fr' | 'en'

const COPY = {
  fr: {
    openChat: 'Ouvrir le chat', close: 'Fermer', ratingTitle: 'Comment s’est passé cet échange ?',
    ratingGroup: 'Note de 1 à 5', ratingRequired: 'Choisissez une note entre 1 et 5.',
    ratingValue: '{count} sur 5', ratingComment: 'Un commentaire ? (facultatif)', cancel: 'Annuler', send: 'Envoyer', ratingThanks: 'Merci, votre avis a bien été envoyé.',
    today: 'Aujourd’hui', yesterday: 'Hier', network: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
    timeout: 'Le serveur met trop de temps à répondre.', malformed: 'Réponse inattendue du serveur.',
    invalidTenant: 'Identifiant de chatbot invalide : un UUID est attendu.', invalidApiUrl: 'L’adresse du serveur VOXO est invalide.',
    rateLimited: 'Trop de messages envoyés. Veuillez patienter avant de continuer.', notFound: 'Ressource introuvable.',
    unavailable: 'Le service est momentanément indisponible. Réessayez dans quelques instants.', genericError: 'Une erreur est survenue.',
    // Liens et erreurs réseau/validation additionnelles
    linkOpenFailed: 'Ce lien ne peut pas être ouvert.',
    messageTooLong: 'Message trop long ({max} caractères maximum).',
    tooManyMessages: 'Vous envoyez trop de messages. Patientez quelques instants.',
    sendFailed: 'Échec de l’envoi.',
    autoCloseFailed: 'La clôture automatique a échoué. Veuillez réessayer.',
    // Pièces jointes
    filePickerFailed: 'Impossible d’ouvrir le sélecteur de fichiers.',
    maxAttachmentsMessage: 'Vous pouvez joindre au maximum {count} fichiers.',
    attachmentsRoomLeft: 'Seuls {count} fichier(s) supplémentaires peuvent être joints.',
    attachmentUploadFailed: 'Envoi du fichier impossible.',
    attachLimitReachedLabel: 'Limite de {count} fichiers atteinte',
    attachFileAction: 'Joindre un fichier',
    uploadingLabel: 'Envoi en cours…',
    removeAttachmentAction: 'Retirer {name}',
    fileEmpty: 'Le fichier est vide.',
    fileUnsupportedFormat: 'Format non pris en charge. Formats acceptés : {list}.',
    fileTooLarge: 'Fichier trop volumineux ({size}). La taille maximale est de {max}.',
    // Évaluations et avis
    feedbackSubmitFailed: 'Votre avis n’a pas pu être enregistré.',
    endConversationFailed: 'Impossible de terminer la conversation.',
    feedbackUseful: 'Réponse utile',
    feedbackNotUseful: 'Réponse inutile',
    // Notifications système / inactivité
    inactivityReminder: 'Bonjour, souhaitez-vous poursuivre notre échange ? Je reste à votre disposition.',
    inactivityClosing: 'Sans réponse de votre part, cette conversation est maintenant clôturée. Vous pourrez démarrer une nouvelle conversation à tout moment.',
    defaultWelcome: 'Bonjour ! Comment puis-je vous aider ?',
    defaultAssistantName: 'Assistant',
    // Reprise humaine
    handoffWaiting: 'Un conseiller a été prévenu',
    handoffActive: 'Vous échangez avec {name}',
    handoffDefaultAgent: 'un conseiller',
    // En-tête / connectivité
    connectivityAssistantAI: 'Assistant IA',
    connectivityAvailable: 'Assistant disponible',
    connectivityUnavailable: 'Service indisponible',
    connectivityConnecting: 'Connexion…',
    rateAction: 'Terminer et noter la conversation',
    newConversationAction: 'Nouvelle conversation',
    closeChatAction: 'Fermer le chat',
    languageAction: 'Langue',
    // Composeur et indicateurs d'accessibilité
    typingIndicatorLabel: 'L’assistant rédige sa réponse',
    composerPlaceholder: 'Écrivez votre message…',
    sendMessageAction: 'Envoyer le message',
    messageNotSent: 'Non envoyé',
    retryAction: 'Réessayer',
    // Historique des conversations archivées
    historyTitle: 'Historique des conversations',
    historyTooltip: 'Historique',
    noHistory: 'Aucune conversation précédente.',
    historyUnavailable: 'Historique indisponible',
    backLabel: 'Retour',
  },
  en: {
    openChat: 'Open chat', close: 'Close', ratingTitle: 'How did the conversation go?',
    ratingGroup: 'Rating from 1 to 5', ratingRequired: 'Choose a rating between 1 and 5.',
    ratingValue: '{count} out of 5', ratingComment: 'Optional comment', cancel: 'Cancel', send: 'Send', ratingThanks: 'Thank you, your feedback was sent.',
    today: 'Today', yesterday: 'Yesterday', network: 'Unable to connect to the server. Check your internet connection.',
    timeout: 'The server is taking too long to respond.', malformed: 'Unexpected server response.',
    invalidTenant: 'Invalid chatbot identifier: a UUID is required.', invalidApiUrl: 'The VOXO server address is invalid.',
    rateLimited: 'Too many messages sent. Please wait before continuing.', notFound: 'Resource not found.',
    unavailable: 'The service is temporarily unavailable. Please try again shortly.', genericError: 'An error occurred.',
    // Links and additional network/validation errors
    linkOpenFailed: 'This link cannot be opened.',
    messageTooLong: 'Message too long ({max} characters maximum).',
    tooManyMessages: 'You are sending too many messages. Please wait a moment.',
    sendFailed: 'Message could not be sent.',
    autoCloseFailed: 'Automatic closing failed. Please try again.',
    // Attachments
    filePickerFailed: 'Unable to open the file picker.',
    maxAttachmentsMessage: 'You can attach up to {count} files.',
    attachmentsRoomLeft: 'Only {count} more file(s) can be attached.',
    attachmentUploadFailed: 'Unable to send the file.',
    attachLimitReachedLabel: 'Limit of {count} files reached',
    attachFileAction: 'Attach a file',
    uploadingLabel: 'Uploading…',
    removeAttachmentAction: 'Remove {name}',
    fileEmpty: 'The file is empty.',
    fileUnsupportedFormat: 'Unsupported format. Accepted formats: {list}.',
    fileTooLarge: 'File too large ({size}). The maximum size is {max}.',
    // Ratings and feedback
    feedbackSubmitFailed: 'Your feedback could not be saved.',
    endConversationFailed: 'Unable to end the conversation.',
    feedbackUseful: 'Helpful response',
    feedbackNotUseful: 'Unhelpful response',
    // System notifications / inactivity
    inactivityReminder: 'Hello, would you like to continue our conversation? I’m still here if you need anything.',
    inactivityClosing: 'Since there has been no response, this conversation is now closed. You can start a new conversation at any time.',
    defaultWelcome: 'Hello! How can I help you?',
    defaultAssistantName: 'Assistant',
    // Human handoff
    handoffWaiting: 'An agent has been notified',
    handoffActive: 'You are chatting with {name}',
    handoffDefaultAgent: 'an agent',
    // Header / connectivity
    connectivityAssistantAI: 'AI Assistant',
    connectivityAvailable: 'Assistant available',
    connectivityUnavailable: 'Service unavailable',
    connectivityConnecting: 'Connecting…',
    rateAction: 'End and rate the conversation',
    newConversationAction: 'New conversation',
    closeChatAction: 'Close chat',
    languageAction: 'Language',
    // Composer and accessibility indicators
    typingIndicatorLabel: 'The assistant is typing a response',
    composerPlaceholder: 'Type your message…',
    sendMessageAction: 'Send message',
    messageNotSent: 'Not sent',
    retryAction: 'Retry',
    // Archived conversation history
    historyTitle: 'Conversation history',
    historyTooltip: 'History',
    noHistory: 'No previous conversations.',
    historyUnavailable: 'History unavailable',
    backLabel: 'Back',
  },
} as const

export type VoxoCopyKey = keyof typeof COPY.fr

export function normalizeLocale(value?: string): VoxoLocale {
  return value?.toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'fr'
}

export function voxoText(locale: VoxoLocale, key: VoxoCopyKey, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), COPY[locale][key] as string,
  )
}

export function catalogsHaveParity(): boolean {
  const fr = Object.keys(COPY.fr).sort()
  const en = Object.keys(COPY.en).sort()
  return fr.length === en.length && fr.every((key, index) => key === en[index])
}
