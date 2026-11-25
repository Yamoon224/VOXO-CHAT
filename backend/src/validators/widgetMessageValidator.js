// Validation du corps de POST /widget/message.
// Extraite de widgetRoutes.js, déjà au-delà de la limite de 250 lignes.
const { MAX_ATTACHMENTS_PER_MESSAGE } = require('../config/fileUploads');
const { messageFor, dynamicMessage } = require('../i18n/messages');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Valide le corps de POST /widget/message.
 *
 * Cette validation est manuelle (pas Joi) et son résultat est écrit directement
 * dans la réponse par widgetRoutes.js, sans passer par errorHandler : elle
 * localise donc elle-même son message, à partir de la locale de la requête.
 *
 * @returns {{error: string, code: string}|null} null si le corps est valide
 */
function validateMessageBody({ message, clientMessageId, attachmentIds }, locale = 'fr') {
  const attachments = Array.isArray(attachmentIds) ? attachmentIds : [];

  if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    // Limite interpolée : le registre ne stocke que des chaînes plates, donc le
    // texte est construit ici (cf. dynamicMessage, src/i18n/messages.js).
    return {
      error: dynamicMessage({
        fr: `Vous pouvez joindre au maximum ${MAX_ATTACHMENTS_PER_MESSAGE} fichiers par message.`,
        en: `You can attach at most ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
      }, locale),
      code: 'TOO_MANY_ATTACHMENTS'
    };
  }

  if (attachments.some(id => !UUID_V4.test(String(id)))) {
    return {
      error: messageFor('INVALID_ATTACHMENT_ID', locale),
      code: 'INVALID_ATTACHMENT_ID'
    };
  }

  // Un message vide est accepté s'il porte au moins une pièce jointe.
  const hasText = typeof message === 'string' && message.trim().length > 0;
  if (!hasText && attachments.length === 0) {
    return { error: messageFor('INVALID_MESSAGE', locale), code: 'INVALID_MESSAGE' };
  }

  if (hasText && message.length > MAX_MESSAGE_LENGTH) {
    // Longueur maximale interpolée : texte construit ici.
    return {
      error: dynamicMessage({
        fr: `Message trop long (max ${MAX_MESSAGE_LENGTH} caractères)`,
        en: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      }, locale),
      code: 'MESSAGE_TOO_LONG'
    };
  }

  if (clientMessageId && !UUID_V4.test(clientMessageId)) {
    return {
      error: messageFor('INVALID_CLIENT_MESSAGE_ID', locale),
      code: 'INVALID_CLIENT_MESSAGE_ID'
    };
  }

  return null;
}

module.exports = { validateMessageBody, UUID_V4, MAX_MESSAGE_LENGTH };
