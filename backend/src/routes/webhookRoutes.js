// backend/src/routes/webhookRoutes.js
const express = require('express');
const webhookController = require('../controllers/webhookController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  resolveTenantFromParam,
  validateTenantAccess,
} = require('../middleware/tenantMiddleware');

const router = express.Router();
const resolveInboundTenant = resolveTenantFromParam({ acknowledgeMissing: true });
const resolveManagedTenant = resolveTenantFromParam();
const managedTenant = [authenticate, resolveManagedTenant, validateTenantAccess];

/**
 * @swagger
 * /api/webhooks/channels/{tenantId}/status:
 *   get:
 *     summary: Recuperer le statut des canaux connectes
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/channels/:tenantId/status', ...managedTenant, webhookController.getChannelsStatus);

/**
 * @swagger
 * /api/webhooks/telegram/{tenantId}:
 *   post:
 *     summary: Réception des messages Telegram pour un tenant spécifique
 *     tags: [Webhooks]
 */
router.post('/telegram/:tenantId', resolveInboundTenant, webhookController.handleTelegramWebhook);

/**
 * @swagger
 * /api/webhooks/telegram/{tenantId}/register:
 *   post:
 *     summary: Enregistrer le webhook auprès de Telegram
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/telegram/:tenantId/register', ...managedTenant, webhookController.registerTelegramWebhook);

/**
 * @swagger
 * /api/webhooks/telegram/{tenantId}/test:
 *   post:
 *     summary: Tester la connexion au bot Telegram
 *     tags: [Webhooks]
 */
router.post('/telegram/:tenantId/test', ...managedTenant, webhookController.testTelegramConnection);

/**
 * @swagger
 * /api/webhooks/telegram/{tenantId}/webhook:
 *   delete:
 *     summary: Supprimer le webhook Telegram (Déconnexion)
 *     tags: [Webhooks]
 */
router.delete('/telegram/:tenantId/webhook', ...managedTenant, webhookController.deleteTelegramWebhook);

/**
 * @swagger
 * /api/webhooks/whatsapp/{tenantId}:
 *   post:
 *     summary: Réception des évènements WhatsApp Cloud API pour un tenant spécifique
 *     tags: [Webhooks]
 */
router.post('/whatsapp/:tenantId', resolveInboundTenant, webhookController.handleWhatsAppWebhook);
router.get('/whatsapp/:tenantId', resolveInboundTenant, webhookController.verifyWhatsAppWebhook);

/**
 * @swagger
 * /api/webhooks/whatsapp/{tenantId}/test:
 *   post:
 *     summary: Tester la connexion WhatsApp Cloud API
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/whatsapp/:tenantId/test', ...managedTenant, webhookController.testWhatsAppConnection);

/**
 * @swagger
 * /api/webhooks/whatsapp/{tenantId}/register:
 *   post:
 *     summary: Enregistrer la configuration WhatsApp Cloud API
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/whatsapp/:tenantId/register', ...managedTenant, webhookController.registerWhatsAppWebhook);

/**
 * @swagger
 * /api/webhooks/whatsapp/{tenantId}/webhook:
 *   delete:
 *     summary: Désactiver le canal WhatsApp
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/whatsapp/:tenantId/webhook', ...managedTenant, webhookController.deleteWhatsAppWebhook);

module.exports = router;
