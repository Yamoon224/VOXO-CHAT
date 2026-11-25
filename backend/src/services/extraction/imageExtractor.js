// backend/src/services/extraction/imageExtractor.js
// OCR d'image via ocrService (sharp pour le prétraitement, tesseract fra+eng).
// Une image sans texte n'est pas une erreur : elle peut rester exploitable par
// la vision du modèle. On retourne donc un contenu vide sans lever.
const ocrService = require('../ocrService');

async function extract(buffer, filename, mimeType) {
  try {
    const result = await ocrService.processImage(buffer, filename, mimeType);
    return {
      content: result.content || '',
      title: result.title,
      extractionMethod: 'tesseract',
      metadata: result.metadata || {}
    };
  } catch (error) {
    console.warn('⚠️ OCR image échoué:', error.message);
    return {
      content: '',
      title: null,
      extractionMethod: 'tesseract-failed',
      metadata: { originalFileName: filename, fileSize: buffer.length, error: error.message }
    };
  }
}

module.exports = { extract };
