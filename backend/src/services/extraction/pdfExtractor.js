// backend/src/services/extraction/pdfExtractor.js
// Extraction PDF : délègue à advancedPDFService, qui tente d'abord une lecture
// directe (pdf-parse) puis bascule sur un OCR page par page (pdf2pic + sharp +
// tesseract) pour les PDF scannés.
const advancedPDFService = require('../advancedPDFService');
const { AppError } = require('../../middleware/errorMiddleware');

async function extract(buffer, filename) {
  const result = await advancedPDFService.processPDF(buffer, filename);

  if (!result?.success || !result.content) {
    throw new AppError(
      "Aucun texte n'a pu être extrait de ce PDF.",
      422,
      { code: 'EXTRACTION_EMPTY' }
    );
  }

  return {
    content: result.content,
    title: result.title,
    extractionMethod: result.metadata?.extractionMethod || 'pdf',
    metadata: result.metadata || {}
  };
}

module.exports = { extract };
