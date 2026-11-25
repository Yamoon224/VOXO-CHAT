// Réception et stockage des pièces jointes persistantes du widget.
const { Op } = require('sequelize');
const { MessageAttachment } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const fileValidationService = require('./fileValidationService');
const imageReadabilityService = require('./imageReadabilityService');
const storageService = require('./storageService');
const extraction = require('./extraction');
const quotaService = require('./quotaService');

const ORPHAN_TTL_MS = 60 * 60 * 1000;

async function receive(tenant, uploadedFile, { enforceQuota = true } = {}) {
  const file = fileValidationService.validateUpload(
    uploadedFile.buffer,
    uploadedFile.originalname,
    uploadedFile.mimetype,
    'conversation'
  );

  if (enforceQuota) await quotaService.assertCanSendMessage(tenant);
  if (!storageService.isConfigured()) {
    throw new AppError(
      "L'envoi de fichiers n'est pas disponible pour le moment.",
      503,
      { code: 'STORAGE_NOT_CONFIGURED' }
    );
  }

  const storageKey = await storageService.upload(
    tenant.id,
    'conversations',
    uploadedFile.buffer,
    { filename: file.filename, mimeType: file.mimeType, extension: file.extension }
  );

  return MessageAttachment.create({
    tenantId: tenant.id,
    storageKey,
    originalName: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.size,
    category: file.category,
    extractionStatus: 'pending',
    extractionMethod: null,
    extractedText: null,
  });
}

/** Prépare un fichier uniquement lorsqu'une réponse IA doit l'utiliser. */
async function prepareForAi(tenantId, attachments) {
  for (const attachment of attachments) {
    if (attachment.extractionStatus !== 'pending') continue;
    try {
      const buffer = await storageService.download(attachment.storageKey, tenantId);
      if (attachment.category === 'image') await imageReadabilityService.assertReadable(buffer);
      const extracted = await extraction.extractText(buffer, attachment.originalName, attachment.mimeType);
      await attachment.update({
        extractionStatus: extracted.content?.trim() ? 'done' : 'empty',
        extractionMethod: extracted.extractionMethod || null,
        extractedText: extracted.content || null,
      });
    } catch (error) {
      console.warn('Pièce jointe : préparation IA échouée', { id: attachment.id, error: error.message });
      await attachment.update({ extractionStatus: 'error' });
      // Une image corrompue n'est jamais envoyée au fournisseur de vision.
      if (error.code === 'IMAGE_UNREADABLE') throw error;
    }
  }
  return attachments;
}

async function loadImageBuffers(tenantId, attachments) {
  const images = attachments.filter(item => item.category === 'image');
  return Promise.all(images.map(async item => {
    try {
      return await storageService.download(item.storageKey, tenantId);
    } catch (error) {
      console.warn('Pièce jointe : relecture impossible', { id: item.id, error: error.message });
      throw new AppError(
        "L'image n'a pas pu être relue. Veuillez réessayer.",
        503,
        { code: 'IMAGE_RETRIEVAL_FAILED' }
      );
    }
  }));
}

async function purgeOrphans(olderThanMs = ORPHAN_TTL_MS) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const orphans = await MessageAttachment.findAll({
    where: { conversationId: null, createdAt: { [Op.lt]: cutoff } },
  });

  let removedCount = 0;
  for (const orphan of orphans) {
    const removed = await storageService.remove(orphan.storageKey, orphan.tenantId);
    if (removed > 0) {
      await orphan.destroy();
      removedCount += 1;
    }
  }
  return removedCount;
}

module.exports = { receive, prepareForAi, loadImageBuffers, purgeOrphans, ORPHAN_TTL_MS };
