const axios = require('axios');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

function assertReference(message) {
  if (!message.media?.reference) {
    throw new AppError('La référence du média Telegram est absente', 400, {
      code: 'MEDIA_REFERENCE_MISSING',
    });
  }
}

async function readBoundedStream(stream, declaredLength) {
  if (declaredLength > config.media.maxBytes) {
    stream.destroy();
    throw new AppError('Le fichier dépasse la taille maximale autorisée de 10 Mo', 413, {
      code: 'MEDIA_TOO_LARGE',
    });
  }

  const chunks = [];
  let sizeBytes = 0;
  for await (const chunk of stream) {
    sizeBytes += chunk.length;
    if (sizeBytes > config.media.maxBytes) {
      stream.destroy();
      throw new AppError('Le fichier dépasse la taille maximale autorisée de 10 Mo', 413, {
        code: 'MEDIA_TOO_LARGE',
      });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function loadMedia(botToken, message) {
  assertReference(message);
  try {
    const fileInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getFile`, {
      params: { file_id: message.media.reference },
      timeout: config.media.downloadTimeoutMs,
    });
    const filePath = fileInfo.data?.result?.file_path;
    if (!filePath) {
      throw new AppError('Telegram n’a pas fourni le fichier demandé', 502, {
        code: 'MEDIA_DOWNLOAD_FAILED',
      });
    }
    const response = await axios.get(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`,
      {
        responseType: 'stream',
        timeout: config.media.downloadTimeoutMs,
      }
    );
    const declaredLength = Number(response.headers?.['content-length']) || 0;
    const buffer = await readBoundedStream(response.data, declaredLength);
    return {
      buffer,
      mimeType: message.media.mimeType || response.headers?.['content-type'] || null,
      fileName: message.media.fileName || filePath.split('/').pop(),
      sizeBytes: buffer.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Impossible de télécharger le média depuis Telegram', 502, {
      code: 'MEDIA_DOWNLOAD_FAILED',
    });
  }
}

module.exports = {
  loadMedia,
  readBoundedStream,
};
