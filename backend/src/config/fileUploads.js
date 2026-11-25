// backend/src/config/fileUploads.js
// Source unique de vérité des règles d'upload côté serveur. Avant ce fichier,
// cinq plafonds contradictoires cohabitaient (multer 100 Mo, ocrService 50 Mo,
// advancedPDFService 100 Mo, config.upload 10 Mo, frontend 10 Mo).
// Miroir client : shared/file-rules.mjs — toute modification va des deux côtés.

const MAX_FILE_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 3;
const MAX_KNOWLEDGE_FILES = 10;
const MAX_KNOWLEDGE_BATCH_BYTES = 30 * 1024 * 1024;

// Contexte texte extrait injecté dans un prompt (cf. docs/TEST_GESTION_MEDIAS_ENTRANTS.md).
const MAX_EXTRACTED_CHARS = 12000;

const DOCUMENT_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
};

const IMAGE_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff'
};

const CONTEXTS = {
  knowledge: { ...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS },
  conversation: { ...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS }
};

/**
 * Types MIME acceptés pour un contexte. Les navigateurs annoncent des types
 * incohérents pour .md (souvent vide ou text/plain) et pour .xlsx envoyé
 * depuis certains OS, d'où les variantes tolérées.
 */
const MIME_ALIASES = {
  'text/x-markdown': 'text/markdown',
  'application/octet-stream': null, // accepté seulement si l'extension et la signature concordent
  'application/vnd.ms-excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpg': 'image/jpeg'
};

function extensionOf(filename) {
  const match = /\.[^.]+$/.exec(String(filename || '').toLowerCase());
  return match ? match[0] : '';
}

function allowedExtensions(context = 'knowledge') {
  return Object.keys(CONTEXTS[context] || CONTEXTS.knowledge);
}

function isAllowedExtension(filename, context = 'knowledge') {
  return Boolean((CONTEXTS[context] || CONTEXTS.knowledge)[extensionOf(filename)]);
}

function canonicalMimeFor(filename) {
  const extension = extensionOf(filename);
  return DOCUMENT_EXTENSIONS[extension] || IMAGE_EXTENSIONS[extension] || null;
}

function categoryOf(filename) {
  const extension = extensionOf(filename);
  if (IMAGE_EXTENSIONS[extension]) return 'image';
  if (DOCUMENT_EXTENSIONS[extension]) return 'document';
  return null;
}

/** Liste lisible pour un message d'erreur destiné à l'utilisateur final. */
function readableExtensions(context = 'knowledge') {
  return allowedExtensions(context).join(', ');
}

module.exports = {
  MAX_FILE_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_KNOWLEDGE_FILES,
  MAX_KNOWLEDGE_BATCH_BYTES,
  MAX_EXTRACTED_CHARS,
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  CONTEXTS,
  MIME_ALIASES,
  extensionOf,
  allowedExtensions,
  isAllowedExtension,
  canonicalMimeFor,
  categoryOf,
  readableExtensions
};
