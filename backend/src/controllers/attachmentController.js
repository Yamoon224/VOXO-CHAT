// Consultation des pièces jointes d'une conversation depuis le dashboard.
// On ne renvoie jamais le binaire ni la clé de stockage : seulement une URL
// signée de courte durée, après vérification de l'appartenance au tenant.
const { MessageAttachment } = require('../models');
const storageService = require('../services/storageService');
const config = require('../config/config');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');

const getAttachmentUrl = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await MessageAttachment.findOne({
      where: { id: attachmentId, tenantId: req.tenant.id },
    });

    if (!attachment) {
      throw new AppError('Pièce jointe introuvable.', 404, { code: 'ATTACHMENT_NOT_FOUND' });
    }

    let url;
    try {
      url = await storageService.createSignedUrl(attachment.storageKey, req.tenant.id);
    } catch (error) {
      console.error(JSON.stringify({
        event: 'attachment_signed_url_failed',
        attachmentId,
        tenantId: req.tenant.id,
        code: error.code || 'STORAGE_ERROR',
        statusCode: error.statusCode || 500,
      }));
      throw error;
    }

    successResponse(res, {
      url,
      name: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.sizeBytes,
      category: attachment.category,
      expiresIn: config.storage.signedUrlTtl,
    }, 'Lien de téléchargement généré');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAttachmentUrl };
