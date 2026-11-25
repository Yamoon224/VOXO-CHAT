// backend/src/services/extraction/index.js
// Point d'entrée unique de l'extraction de texte. Remplace l'ancien
// ocrService.processFile, dont la branche PDF scanné renvoyait du texte
// simulé en dur qui se retrouvait indexé comme une vraie connaissance.
const path = require('path');
const { AppError } = require('../../middleware/errorMiddleware');
const { extensionOf } = require('../../config/fileUploads');
const { dynamicMessage } = require('../../i18n/messages');
const pdfExtractor = require('./pdfExtractor');
const spreadsheetExtractor = require('./spreadsheetExtractor');
const documentExtractor = require('./documentExtractor');
const imageExtractor = require('./imageExtractor');

/** Titre de repli quand l'extracteur n'en fournit pas. */
function titleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return (
    base
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toUpperCase())
      .slice(0, 100) || 'Document'
  );
}

async function dispatch(buffer, filename, mimeType, extension) {
  switch (extension) {
    case '.pdf':
      return pdfExtractor.extract(buffer, filename);
    case '.xlsx':
      return spreadsheetExtractor.extract(buffer, filename);
    case '.doc':
    case '.docx':
      return documentExtractor.extractWord(buffer, filename);
    case '.txt':
    case '.md':
      return documentExtractor.extractPlainText(buffer, filename);
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.webp':
    case '.gif':
    case '.bmp':
    case '.tif':
    case '.tiff':
      return imageExtractor.extract(buffer, filename, mimeType);
    default:
      // Extension interpolée : texte résolu ici, MESSAGES[code] ne portant
      // qu'une chaîne plate. Cf. dynamicMessage() dans src/i18n/messages.js.
      throw new AppError(
        dynamicMessage({
          fr: `Format non pris en charge : ${extension}`,
          en: `Unsupported format: ${extension}`,
        }),
        400,
        { code: 'UNSUPPORTED_FILE_TYPE', preTranslated: true }
      );
  }
}

/**
 * Extrait le texte d'un fichier déjà validé par fileValidationService.
 * @returns {Promise<{content, title, extractionMethod, metadata}>}
 */
async function extractText(buffer, filename, mimeType) {
  const extension = extensionOf(filename);
  const result = await dispatch(buffer, filename, mimeType, extension);

  return {
    ...result,
    title: result.title || titleFromFilename(filename),
    metadata: {
      originalFileName: filename,
      fileSize: buffer.length,
      mimeType,
      ...result.metadata,
      extractionMethod: result.extractionMethod
    }
  };
}

module.exports = { extractText, titleFromFilename };
