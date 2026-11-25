// backend/src/services/knowledgeIngestionService.js
// Orchestration de l'import d'un fichier dans la base de connaissance :
// valider -> extraire -> conserver l'original -> créer -> indexer.
// Extrait de knowledgeController, qui ne doit plus grossir.
const { KnowledgeBase } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { MAX_EXTRACTED_CHARS } = require('../config/fileUploads');
const fileValidationService = require('./fileValidationService');
const storageService = require('./storageService');
const extraction = require('./extraction');
const fileProcessingService = require('./fileProcessingService');
const quotaService = require('./quotaService');
const ragService = require('./ragService');
const imageReadabilityService = require('./imageReadabilityService');

// En deçà, l'extraction n'a rien produit d'exploitable (page blanche, scan illisible).
const MIN_USEFUL_CONTENT = 10;

/** Tags déduits du contenu, du format et de la méthode d'extraction. */
function generateAutoTags(title, content, filename, metadata = {}) {
  const tags = fileProcessingService.generateTags(title || '', content || '', 'upload');

  const extension = String(filename || '').toLowerCase().split('.').pop();
  if (extension && extension !== filename) tags.push(extension);
  if (metadata.extractionMethod) tags.push(String(metadata.extractionMethod).toLowerCase());

  return [...new Set(tags)].slice(0, 5);
}

/** Fusionne tags automatiques et tags saisis ; les tags utilisateur priment. */
function combineTags(autoTags = [], userTags = []) {
  const normalize = value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Le multipart/form-data transmet les tags en chaîne
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Pas du JSON : on retombe sur le découpage par virgules
      }
      return value.split(',');
    }
    return [];
  };

  const cleaned = [...normalize(userTags), ...normalize(autoTags)]
    .map(tag => String(tag).trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50);

  return [...new Set(cleaned)].slice(0, 10);
}

/**
 * Valide puis extrait le texte d'un fichier. Ne touche ni au stockage ni à la
 * base : réutilisable pour l'aperçu et pour le retraitement.
 */
async function validateAndExtract(buffer, originalName, mimeType, context = 'knowledge') {
  const file = fileValidationService.validateUpload(buffer, originalName, mimeType, context);
  if (file.category === 'image') await imageReadabilityService.assertReadable(buffer);
  const extracted = await extraction.extractText(buffer, file.filename, file.mimeType);

  if (!extracted.content || extracted.content.trim().length < MIN_USEFUL_CONTENT) {
    throw new AppError(
      "Le fichier a été lu mais aucun texte exploitable n'en a été extrait.",
      422,
      { code: 'EXTRACTION_EMPTY' }
    );
  }

  return { file, extracted };
}

/**
 * Conserve l'original. Un stockage non configuré ne bloque pas l'import :
 * le document est créé sans original, seul le retraitement sera indisponible.
 */
async function persistOriginal(tenantId, buffer, file) {
  if (!storageService.isConfigured()) {
    console.warn('⚠️ Stockage non configuré : le fichier d\'origine ne sera pas conservé.');
    return null;
  }

  try {
    const key = await storageService.upload(tenantId, 'knowledge', buffer, {
      filename: file.filename,
      mimeType: file.mimeType,
      extension: file.extension
    });
    return { key, size: file.size, mimeType: file.mimeType, originalName: file.filename };
  } catch (error) {
    console.error('⚠️ Conservation de l\'original échouée:', error.message);
    return null;
  }
}

/** Reconstruit les chunks RAG en arrière-plan (pas de job system dans ce repo). */
function indexAsync(knowledgeItem) {
  ragService
    .rebuildKnowledgeItem(knowledgeItem, { force: true })
    .then(result => knowledgeItem.update({
      metadata: {
        ...knowledgeItem.metadata,
        ragIndexed: true,
        ragIndexedAt: new Date().toISOString(),
        ragChunksCreated: result.created,
        ragChunksEmbedded: result.embedded
      }
    }))
    .catch(error => console.error(`Erreur RAG pour "${knowledgeItem.title}":`, error.message));
}

/**
 * Point d'entrée de l'import d'un fichier.
 * @param {{buffer, originalname, mimetype}} uploadedFile
 */
async function ingestFile(tenant, user, uploadedFile, { title, tags } = {}) {
  await quotaService.assertCanCreateDocuments(tenant);

  const { file, extracted } = await validateAndExtract(
    uploadedFile.buffer,
    uploadedFile.originalname,
    uploadedFile.mimetype
  );

  const storage = await persistOriginal(tenant.id, uploadedFile.buffer, file);
  const autoTags = generateAutoTags(extracted.title, extracted.content, file.filename, extracted.metadata);

  const knowledgeItem = await KnowledgeBase.create({
    tenantId: tenant.id,
    title: title || extracted.title,
    content: extracted.content,
    sourceType: 'upload',
    tags: combineTags(autoTags, tags),
    isActive: true,
    metadata: {
      ...extracted.metadata,
      storage,
      uploadTimestamp: new Date().toISOString(),
      userProvided: { customTitle: Boolean(title), customTags: Boolean(tags) }
    },
    createdBy: user.id
  });

  indexAsync(knowledgeItem);
  return knowledgeItem;
}

/** Retraite un document importé depuis son fichier d'origine conservé. */
async function reingestFile(tenant, knowledgeItem) {
  const storage = knowledgeItem.metadata?.storage;

  if (!storage?.key) {
    throw new AppError(
      "Le fichier d'origine de ce document n'a pas été conservé : il ne peut pas être retraité.",
      409,
      { code: 'ORIGINAL_NOT_STORED' }
    );
  }

  const buffer = await storageService.download(storage.key, tenant.id);
  const { file, extracted } = await validateAndExtract(
    buffer,
    storage.originalName || knowledgeItem.title,
    storage.mimeType
  );

  await knowledgeItem.update({
    content: extracted.content,
    metadata: {
      ...knowledgeItem.metadata,
      ...extracted.metadata,
      storage,
      reprocessedAt: new Date().toISOString()
    }
  });

  indexAsync(knowledgeItem);
  return { knowledgeItem, extractionMethod: extracted.extractionMethod, filename: file.filename };
}

/** Supprime l'original associé à un document. Best-effort. */
async function removeOriginal(tenantId, knowledgeItem) {
  const key = knowledgeItem?.metadata?.storage?.key;
  if (key) await storageService.remove(key, tenantId);
}

module.exports = {
  ingestFile,
  reingestFile,
  removeOriginal,
  validateAndExtract,
  generateAutoTags,
  combineTags,
  indexAsync,
  MAX_EXTRACTED_CHARS
};
