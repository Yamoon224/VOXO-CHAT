// backend/src/services/extraction/documentExtractor.js
// Extraction des documents Word (mammoth) et des fichiers texte / Markdown.
const mammoth = require('mammoth');
const { AppError } = require('../../middleware/errorMiddleware');

/** Normalise les sauts de ligne et les espaces sans écraser la structure. */
function cleanText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

async function extractWord(buffer, filename) {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (error) {
    console.error('❌ Word: extraction impossible:', error.message);
    throw new AppError(
      'Ce document Word est illisible. Enregistrez-le au format .docx puis réessayez.',
      400,
      { code: 'EXTRACTION_FAILED' }
    );
  }

  const content = cleanText(result.value);
  if (!content) {
    throw new AppError('Ce document ne contient aucun texte.', 422, { code: 'EXTRACTION_EMPTY' });
  }

  return {
    content,
    title: null,
    extractionMethod: 'mammoth',
    metadata: {
      originalFileName: filename,
      fileSize: buffer.length,
      warnings: result.messages?.length || 0
    }
  };
}

async function extractPlainText(buffer, filename) {
  const content = cleanText(buffer.toString('utf8'));

  if (!content) {
    throw new AppError('Ce fichier ne contient aucun texte.', 422, { code: 'EXTRACTION_EMPTY' });
  }

  return {
    content,
    title: null,
    extractionMethod: 'utf8',
    metadata: {
      originalFileName: filename,
      fileSize: buffer.length,
      encoding: 'utf8'
    }
  };
}

module.exports = { extractWord, extractPlainText, cleanText };
