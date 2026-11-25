const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { successResponse } = require('../utils/responseUtils');
const { validate } = require('../middleware/validationMiddleware');
const { requestLocale } = require('../i18n/locale');
const { updateTenantSettingsSchema, conversationExportRecipientsSchema } = require('../validators/tenantValidators');
const tenantSettingsService = require('../services/tenantSettingsService');
const chatbotSettingsService = require('../services/chatbotSettingsService');
const { DEFAULT_TONE } = require('../services/chatPromptBuilder');
const { validateDomainList } = require('../../../shared/allowed-domains');
const { validateAppIdList } = require('../../../shared/allowed-apps');
const mobilePushSettingsService = require('../services/mobilePushSettingsService');
const conversationExportSettingsService = require('../services/conversationExportSettingsService');
const tenantQuotaController = require('../controllers/tenantQuotaController');
const billingController = require('../controllers/billingController');
const supportRoutes = require('./supportRoutes');
const billingRoutes = require('./billingRoutes');
const { computeTenantFeatures } = require('../services/tenantFeatureFlags');
const creditController = require('../controllers/creditController');
const storage = require('../services/storageService');
const brandingMediaController = require('../controllers/brandingMediaController');
const { uploadKnowledgeFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Modifier ce qu'est l'entreprise (identité, apparence publique du chatbot)
// exige `company:write`, plafonné à la lecture pour un membre de rôle « user ».
const canWriteCompany = [authenticate, requirePermission('company', 'write')];
const canReadCompany = [authenticate, requirePermission('company', 'read')];

router.get('/test', (req, res) => {
  successResponse(res, { 
    tenant: req.tenant,
    message: 'Tenant routes working!' 
  }, 'Tenant test successful');
});

/**
 * @swagger
 * /api/tenant/profile:
 *   get:
 *     summary: Récupérer le profil du tenant (entreprise)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *       401:
 *         description: Non authentifié
 */
// VOLONTAIREMENT sans garde `company` : la coquille du dashboard (barre
// latérale, en-tête) lit le nom et le plan du tenant pour TOUT membre. Poser
// un requirePermission ici viderait l'interface d'un membre sans accès
// entreprise. Ne pas « corriger ».
router.get('/profile',
  authenticate,
  async (req, res, next) => {
    try {
      const tenant = req.tenant;
      
      const tenantData = {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscriptionPlan,
        isActive: tenant.isActive,
        allowedDomains: tenant.allowedDomains || [],
        enforceDomains: tenant.enforceDomains || false,
        allowedAppIds: tenant.allowedAppIds || [],
        enforceAppIds: tenant.enforceAppIds || false,
        settings: tenant.settings || {},
        // Dérivées du forfait, jamais lues dans `settings` : une édition de
        // forfait s'applique ainsi immédiatement, sans recopie ni backfill.
        features: await computeTenantFeatures(tenant),
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };

      const logoKey = tenant.settings?.branding?.logoStorageKey;
      if (logoKey) tenantData.logoUrl = await storage.createSignedUrl(logoKey, tenant.id);
      successResponse(res, tenantData, 'Profil du tenant récupéré');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/tenant/quota:
 *   get:
 *     summary: Consommation et limites du forfait de l'entreprise
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consommation courante (messages, documents, utilisateurs)
 *       401:
 *         description: Non authentifié
 */
// Comme `/profile`, volontairement sans garde `company` : la barre latérale et
// le tableau de bord affichent la consommation à TOUT membre.
router.get('/quota', authenticate, tenantQuotaController.getQuota);
router.get('/credits', authenticate, creditController.getTenantWallet);
router.get('/plans', authenticate, billingController.getPlans);
router.use('/billing', billingRoutes);

/**
 * @swagger
 * /api/tenant/settings:
 *   put:
 *     summary: Mettre à jour les paramètres de base du tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               domain:
 *                 type: string
 *               subdomain:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 */
router.put('/settings',
  canWriteCompany,
  validate(updateTenantSettingsSchema),
  async (req, res, next) => {
    try {
      const settings = await tenantSettingsService.updateSettings(req.tenant, req.body, requestLocale(req));
      successResponse(res, settings, 'Paramètres du tenant mis à jour');
    } catch (error) {
      next(error);
    }
  }
);

router.post('/branding/logo', canWriteCompany, uploadKnowledgeFile, brandingMediaController.uploadLogo);

/**
 * @swagger
 * /api/tenant/chatbot-settings:
 *   put:
 *     summary: Mettre à jour les paramètres du chatbot
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               welcomeMessage:
 *                 type: string
 *               theme:
 *                 type: object
 *                 properties:
 *                   primaryColor:
 *                     type: string
 *                   position:
 *                     type: string
 *               features:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration mise à jour
 */
router.put('/chatbot-settings',
  canWriteCompany,
  async (req, res, next) => {
    try {
      const result = await chatbotSettingsService.update(req.tenant, req.body);

      successResponse(res, result, 'Settings du chatbot mis à jour');
    } catch (error) {
      next(error);
    }
  }
);

router.get('/conversation-export-settings', canWriteCompany, (req, res) => {
  successResponse(res, {
    allowedRecipients: conversationExportSettingsService.getAllowedRecipients(req.tenant),
  }, 'Destinataires autorisés récupérés');
});

router.put('/conversation-export-settings', canWriteCompany,
  validate(conversationExportRecipientsSchema), async (req, res, next) => {
    try {
      const allowedRecipients = await conversationExportSettingsService.updateAllowedRecipients(
        req.tenant,
        req.body.allowedRecipients,
      );
      successResponse(res, { allowedRecipients }, 'Destinataires autorisés mis à jour');
    } catch (error) {
      next(error);
    }
  });

router.put('/allowed-domains', canWriteCompany, async (req, res, next) => {
  try {
    const { value, error } = validateDomainList(req.body.allowedDomains);
    if (error) return res.status(400).json({ success: false, error, code: 'INVALID_ALLOWED_DOMAINS' });
    const enforceDomains = Boolean(req.body.enforceDomains) && value.length > 0;
    await req.tenant.update({ allowedDomains: value, enforceDomains });
    return successResponse(res, { allowedDomains: value, enforceDomains }, 'Domaines autorisés mis à jour');
  } catch (error) { return next(error); }
});

// Identifiants d'application mobiles autorisés (voir mobile/CONTRACT.md).
router.put('/allowed-apps', canWriteCompany, async (req, res, next) => {
  try {
    const { value, error } = validateAppIdList(req.body.allowedAppIds);
    if (error) return res.status(400).json({ success: false, error, code: 'INVALID_ALLOWED_APP_IDS' });
    const enforceAppIds = Boolean(req.body.enforceAppIds) && value.length > 0;
    await req.tenant.update({ allowedAppIds: value, enforceAppIds });
    return successResponse(res, { allowedAppIds: value, enforceAppIds }, 'Applications autorisées mises à jour');
  } catch (error) { return next(error); }
});

// Notifications push mobiles : identifiants FCM/APNs du propriétaire (écriture seule, chiffrés).
router.get('/mobile-push', canReadCompany, (req, res) => {
  successResponse(res, mobilePushSettingsService.getStatus(req.tenant), 'Notifications mobiles');
});
router.put('/mobile-push', canWriteCompany, async (req, res, next) => {
  try {
    successResponse(res, await mobilePushSettingsService.update(req.tenant, req.body), 'Notifications mobiles mises à jour');
  } catch (error) { next(error); }
});

// Récupérer les settings du chatbot
router.get('/chatbot-settings',
  canReadCompany,
  async (req, res, next) => {
    try {
      const tenant = req.tenant;
      const chatbotSettings = tenant.settings?.chatbot || {
        name: 'Assistant',
        welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
        tone: DEFAULT_TONE,
        theme: {
          primaryColor: '#3b82f6',
          textColor: '#333333',
          position: 'bottom-right'
        },
        features: {
          leadGeneration: false,
          analytics: true,
          customBranding: false
        }
      };
      
      successResponse(res, { chatbot: chatbotSettings }, 'Settings récupérés');
    } catch (error) {
      next(error);
    }
  }
);

// La suppression de l'entreprise n'est plus une action de tenant : elle passe
// par DELETE /api/auth/account, seul endroit qui gère le transfert de propriété
// et la rétention de 30 jours avant purge définitive.

// Demandes d'assistance vers la plateforme. Montées ici plutôt que dans
// `app.js` : le routeur tenant apporte déjà `extractTenantFromRequest`.
router.use('/support', supportRoutes);
router.use('/agent-actions', require('./agentActionRoutes'));

module.exports = router;
