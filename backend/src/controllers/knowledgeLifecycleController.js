// Cycle de vie d'un document : duplication, archivage, historique, export.
// Extraits de knowledgeRoutes.js, où ils étaient écrits en ligne dans le routeur.
const { KnowledgeBase } = require('../models');
const quotaService = require('../services/quotaService');
const storageService = require('../services/storageService');
const config = require('../config/config');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');

/** Recherche toujours portée au tenant : un id seul ne suffit jamais. */
const findTenantItem = async (id, tenantId) => {
  const item = await KnowledgeBase.findOne({ where: { id, tenantId } });
  if (!item) throw new AppError('Élément non trouvé', 404, { code: 'KNOWLEDGE_NOT_FOUND' });
  return item;
};

/** Copie un document ; la copie compte dans le quota si elle est active. */
const duplicateKnowledge = async (req, res, next) => {
  try {
    const { tenant, user } = req;
    const originalItem = await findTenantItem(req.params.id, tenant.id);

    await quotaService.assertCanCreateDocuments(tenant, originalItem.isActive ? 1 : 0);

    const duplicatedItem = await KnowledgeBase.create({
      tenantId: tenant.id,
      title: `${originalItem.title} (Copie)`,
      content: originalItem.content,
      sourceType: originalItem.sourceType,
      sourceUrl: originalItem.sourceUrl,
      tags: [...originalItem.tags, 'copie'],
      isActive: originalItem.isActive,
      metadata: {
        ...originalItem.metadata,
        duplicatedFrom: originalItem.id,
        duplicatedAt: new Date().toISOString(),
      },
      createdBy: user.id,
    });

    successResponse(res, {
      id: duplicatedItem.id,
      title: duplicatedItem.title,
    }, 'Connaissance dupliquée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/** Archiver revient à désactiver : le document sort du contexte du chatbot. */
const archiveKnowledge = async (req, res, next) => {
  try {
    const { archive = true } = req.body;
    const knowledgeItem = await findTenantItem(req.params.id, req.tenant.id);

    await knowledgeItem.update({
      isActive: !archive,
      metadata: {
        ...knowledgeItem.metadata,
        archivedAt: archive ? new Date().toISOString() : null,
      },
    });

    successResponse(res, {
      id: knowledgeItem.id,
      isActive: knowledgeItem.isActive,
    }, `Connaissance ${archive ? 'archivée' : 'désarchivée'} avec succès`);
  } catch (error) {
    next(error);
  }
};

/** Ce qu'on sait du traitement d'un fichier : extraction, OCR, indexation. */
const getProcessingHistory = async (req, res, next) => {
  try {
    const item = await findTenantItem(req.params.id, req.tenant.id);
    const metadata = item.metadata || {};

    successResponse(res, {
      originalFile: {
        name: metadata.originalFileName,
        size: metadata.fileSize,
        type: metadata.mimeType,
      },
      processing: {
        method: metadata.extractionMethod,
        engine: metadata.ocrEngine,
        confidence: metadata.ocrConfidence,
        pageCount: metadata.pageCount,
        processingTime: metadata.processingTime,
      },
      results: {
        textLength: item.content?.length,
        hasEmbedding: !!item.embedding,
        embeddingGeneratedAt: metadata.embeddingGeneratedAt,
      },
    }, 'Historique de traitement récupéré');
  } catch (error) {
    next(error);
  }
};

const EXPORT_ATTRIBUTES = [
  'id', 'title', 'content', 'sourceType', 'sourceUrl',
  'tags', 'isActive', 'createdAt', 'updatedAt',
];

const toExportItem = (item, includeProcessingData) => {
  const exportItem = EXPORT_ATTRIBUTES.reduce((acc, key) => {
    acc[key] = item[key];
    return acc;
  }, {});

  if (includeProcessingData && item.metadata) {
    exportItem.processingMetadata = {
      extractionMethod: item.metadata.extractionMethod,
      ocrEngine: item.metadata.ocrEngine,
      confidence: item.metadata.ocrConfidence,
      originalFileName: item.metadata.originalFileName,
      fileSize: item.metadata.fileSize,
    };
  }

  return exportItem;
};

/** Export JSON téléchargeable de la base, métadonnées de traitement en option. */
const exportKnowledgeAsJson = async (req, res, next) => {
  try {
    const { tenant } = req;
    const { includeInactive = false, includeProcessingData = false } = req.query;

    const whereClause = { tenantId: tenant.id };
    if (!includeInactive) whereClause.isActive = true;

    const attributes = includeProcessingData
      ? [...EXPORT_ATTRIBUTES, 'metadata']
      : EXPORT_ATTRIBUTES;

    const knowledgeItems = await KnowledgeBase.findAll({
      where: whereClause,
      attributes,
      order: [['createdAt', 'DESC']],
    });

    const exportedOn = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="knowledge-base-${tenant.name}-${exportedOn}.json"`
    );
    res.json({
      exportedAt: new Date().toISOString(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      totalItems: knowledgeItems.length,
      includeProcessingData,
      items: knowledgeItems.map(item => toExportItem(item, includeProcessingData)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lien de téléchargement du fichier d'origine. On ne renvoie jamais le binaire
 * ni la clé de stockage : seulement une URL signée de courte durée, générée
 * après vérification que le document appartient bien au tenant.
 */
const getOriginalFileUrl = async (req, res, next) => {
  try {
    const item = await findTenantItem(req.params.id, req.tenant.id);
    const storage = item.metadata?.storage;

    if (!storage?.key) {
      throw new AppError(
        "Le fichier d'origine de ce document n'a pas été conservé.",
        404,
        { code: 'ORIGINAL_NOT_STORED' }
      );
    }

    const url = await storageService.createSignedUrl(storage.key, req.tenant.id);

    successResponse(res, {
      url,
      originalName: storage.originalName,
      mimeType: storage.mimeType,
      size: storage.size,
      expiresIn: config.storage.signedUrlTtl,
    }, 'Lien de téléchargement généré');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  duplicateKnowledge,
  archiveKnowledge,
  getProcessingHistory,
  exportKnowledgeAsJson,
  getOriginalFileUrl,
};
