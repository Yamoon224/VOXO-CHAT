const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const whatsappService = require('./whatsappService');

async function loadMedia(message, accessToken) {
  if (!message.media?.reference) {
    throw new AppError('Meta n’a pas fourni le média WhatsApp', 502, { code: 'MEDIA_DOWNLOAD_FAILED' });
  }
  const media = await whatsappService.downloadMedia(message.media.reference, accessToken);
  if (!media.buffer.length) throw new AppError('Le fichier reçu est vide ou invalide', 400, { code: 'MEDIA_EMPTY' });
  if (media.buffer.length > config.media.maxBytes) {
    throw new AppError('Le fichier dépasse la taille maximale autorisée de 10 Mo', 413, { code: 'MEDIA_TOO_LARGE' });
  }
  return { ...media, sizeBytes: media.buffer.length };
}

module.exports = { loadMedia };
