// Envoi de pièces jointes depuis le widget (public).
// Fichier séparé pour ne pas faire grossir widgetRoutes.js, déjà au-delà
// de la limite de 250 lignes.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { successResponse } = require('../utils/responseUtils');
const { uploadConversationFile } = require('../middleware/uploadMiddleware');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const planService = require('../services/planService');

// L'upload déclenche stockage et extraction : bien plus coûteux qu'un message.
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Trop de fichiers envoyés. Veuillez patienter avant de réessayer.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Le propriétaire doit avoir activé la fonctionnalité pour son chatbot. */
const requireAttachmentsEnabled = async (req, res, next) => {
  if (req.tenant?.settings?.chatbot?.options?.features?.attachments === false) {
    return res.status(403).json({
      success: false,
      error: "L'envoi de fichiers n'est pas activé pour ce chatbot.",
      code: 'ATTACHMENTS_DISABLED'
    });
  }
  const plan = await planService.getPlan(req.tenant.subscriptionPlan);
  if (plan.allowVisitorAttachments === false) return res.status(403).json({ success: false, error: "L'envoi de fichiers n'est pas inclus dans votre forfait.", code: 'PLAN_VISITOR_ATTACHMENTS_DISABLED' });
  return next();
};

/**
 * Répond un identifiant à passer ensuite dans attachmentIds de
 * POST /widget/message. Le fichier reste orphelin tant qu'aucun message
 * ne l'a consommé, et un balayage supprime les orphelins au bout d'une heure.
 */
const handleUpload = async (req, res, next) => {
  try {
    const attachment = await widgetAttachmentService.receive(req.tenant, req.file);
    successResponse(res, attachment.toPublicJSON(), 'Fichier reçu', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Le routeur est construit à chaque appel : un routeur partagé entre plusieurs
 * montages accumulerait les routes et la première inscription l'emporterait.
 * @param {Function[]} tenantGuards middlewares de validation du tenant widget
 */
module.exports = (tenantGuards) => {
  const router = express.Router();

  router.post('/upload',
    uploadLimiter,
    ...tenantGuards,
    requireAttachmentsEnabled,
    uploadConversationFile,
    handleUpload
  );
  return router;
};
