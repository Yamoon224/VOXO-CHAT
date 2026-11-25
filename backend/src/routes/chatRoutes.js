// backend/src/routes/chatRoutes.js - Version Claude
const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendMessage } = require('../controllers/chatMessageController');
const {
  getConversationHistory,
  getConversations,
  endConversation,
  updateConversationTitle,
  testAI, // Changé de testClaude
  improveResponse,
} = require('../controllers/chatController');
const {
  analyzeSentiment,
  batchSummary,
} = require('../controllers/conversationInsightsController');
const { getAttachmentUrl } = require('../controllers/attachmentController');
const {
  downloadConversationPdf,
  downloadSelectedConversations,
  emailConversationPdf,
} = require('../controllers/conversationExportController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { computeTenantFeatures } = require('../services/tenantFeatureFlags');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { chatValidators } = require('../validators/chatValidators');
const handoffController = require('../controllers/conversationHandoffController');
const { optionalConversationFile } = require('../middleware/uploadMiddleware');
const organizationController = require('../controllers/conversationOrganizationController');
const attentionController = require('../controllers/conversationAttentionController');
const commercialOutcomeController = require('../controllers/commercialOutcomeController');

const router = express.Router();

// Consulter les conversations du dashboard ; répondre / clôturer exige l'écriture.
const canReadConversations = [authenticate, requirePermission('conversations', 'read')];
const canWriteConversations = [authenticate, requirePermission('conversations', 'write')];

// Rate limiting pour les messages de chat
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages par minute max
  message: {
    error: 'Trop de messages envoyés. Veuillez patienter avant de continuer.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting plus strict pour l'amélioration de réponses (API Claude premium)
const improvementLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 améliorations par 5 minutes
  message: {
    error: 'Trop de demandes d\'amélioration. Veuillez patienter 5 minutes.',
  },
});

const exportEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de demandes d’export par email. Veuillez patienter.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== ROUTES PUBLIQUES (pour le widget) =====

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Envoyer un message au chatbot
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Réponse du chatbot
 */
router.post('/message',
  chatLimiter,
  optionalAuth, // Authentification optionnelle
  validate(chatValidators.sendMessageSchema),
  sendMessage
);

// Test de connectivité IA (OpenRouter)
router.get('/test-ai',
  testAI
);

// ===== ROUTES PROTÉGÉES (pour le dashboard) =====

/**
 * @swagger
 * /api/chat/conversation/{sessionId}:
 *   get:
 *     summary: Récupérer l'historique d'une conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historique de la conversation
 */
router.get('/conversation/:sessionId',
  canReadConversations,
  validate(chatValidators.getHistorySchema),
  getConversationHistory
);

// Lister toutes les conversations
router.get('/conversations',
  canReadConversations,
  validate(chatValidators.getConversationsSchema),
  getConversations
);

// Lien signé vers une pièce jointe reçue dans une conversation
router.get('/attachments/:attachmentId/url', canReadConversations, getAttachmentUrl);

router.get('/conversation/:sessionId/export', canWriteConversations, downloadConversationPdf);
router.post('/conversations/export', canWriteConversations,
  validate(chatValidators.exportSelectedConversationsSchema), downloadSelectedConversations);
router.post('/conversation/:sessionId/email-export', canWriteConversations, exportEmailLimiter,
  validate(chatValidators.emailConversationExportSchema), emailConversationPdf);

// Terminer une conversation (avec analyse de sentiment Claude)
router.post('/conversation/:sessionId/end',
  canWriteConversations,
  validate(chatValidators.endConversationSchema),
  endConversation
);

router.patch('/conversation/:sessionId/title',
  canWriteConversations,
  validate(chatValidators.updateConversationTitleSchema),
  updateConversationTitle
);
router.patch('/conversation/:sessionId/priority', canWriteConversations,
  validate(chatValidators.updateConversationPrioritySchema), organizationController.updatePriority);
router.get('/conversation-labels', canReadConversations, organizationController.listLabels);
router.post('/conversation-labels', canWriteConversations,
  validate(chatValidators.labelSchema), organizationController.createLabel);
router.patch('/conversation-labels/:labelId', canWriteConversations,
  validate(chatValidators.updateLabelSchema), organizationController.updateLabel);
router.delete('/conversation-labels/:labelId', canWriteConversations, organizationController.deleteLabel);
router.put('/conversation/:sessionId/labels', canWriteConversations,
  validate(chatValidators.assignLabelsSchema), organizationController.assignLabels);
router.post('/conversation/:sessionId/read', canReadConversations, attentionController.markRead);
router.post('/conversation/:sessionId/take', canWriteConversations, handoffController.take);
router.post('/conversation/:sessionId/return-to-ai', canWriteConversations, handoffController.returnToAi);
router.post('/conversation/:sessionId/agent-message', canWriteConversations, optionalConversationFile, handoffController.send);
router.patch('/commercial-requests/:requestId', canWriteConversations, validate(chatValidators.updateCommercialRequestSchema), commercialOutcomeController.update);

// Nouvelle route : Améliorer une réponse avec Claude
router.post('/improve-response',
  canWriteConversations,
  improvementLimiter,
  improveResponse
);

// ===== ROUTES D'ADMINISTRATION (pour les admins) =====

// Analyses en lecture seule : elles n'écrivent rien, elles éclairent.
router.post('/analyze-sentiment',
  canReadConversations,
  analyzeSentiment
);

// Générer un résumé de conversations multiples
router.post('/batch-summary',
  canReadConversations,
  batchSummary
);

// ===== ROUTES DE TEST ET DEBUG =====
if (process.env.NODE_ENV === 'development') {
  const { successResponse } = require('../utils/responseUtils');

  // Route de test générale
  router.get('/test', (req, res) => {
    successResponse(res, {
      message: 'Chat routes working with ChatGPT Nano!',
      tenant: req.tenant?.name || 'No tenant',
      aiAvailable: require('../services/openaiService').isAvailable(),
      model: process.env.OPENAI_MODEL || 'openai/gpt-5.4-nano',
    }, 'Chat test successful');
  });

  // Route de test des performances Claude
  router.post('/test-performance',
    authenticate,
    async (req, res, next) => {
      try {
        const { message = 'Test de performance' } = req.body;
        const openaiService = require('../services/openaiService');

        const startTime = Date.now();

        const response = await openaiService.generateChatResponse(
          req.tenant.id,
          message,
          [],
          req.tenant.settings,
          req.tenant.name,
          { tenantFeatures: await computeTenantFeatures(req.tenant) }
        );

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        res.json({
          success: true,
          data: {
            response: response.response,
            responseTime: `${responseTime}ms`,
            model: response.model,
            tokensUsed: response.tokensUsed,
            sources: response.sources.length
          },
          message: `Claude response generated in ${responseTime}ms`
        });

      } catch (error) {
        next(error);
      }
    }
  );
}

module.exports = router;
