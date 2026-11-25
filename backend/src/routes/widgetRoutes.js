// backend/src/routes/widgetRoutes.js - Routes publiques améliorées pour le widget
const express = require('express');
const { resolveLocalizedContent } = require('../services/localizedChatbotContent');
const rateLimit = require('express-rate-limit');
const { successResponse } = require('../utils/responseUtils');
const { sendMessage } = require('../controllers/chatMessageController');
const { getConversationHistory, endConversation, submitMessageFeedback } = require('../controllers/chatController');
const openaiService = require('../services/openaiService');
const { extractTenantFromRequest } = require('../middleware/tenantMiddleware');
const widgetAttachmentRoutes = require('./widgetAttachmentRoutes');
const { validateMessageBody } = require('../validators/widgetMessageValidator');
const { requestLocale } = require('../i18n/locale');
const { MAX_ATTACHMENTS_PER_MESSAGE, MAX_FILE_BYTES } = require('../config/fileUploads');
const { widgetOriginGuard, widgetAppIdGuard } = require('../middleware/widgetOriginGuard');
const brandingMediaController = require('../controllers/brandingMediaController');
const mobilePushService = require('../services/mobilePushService');

const router = express.Router();

// Les URLs publiques ne révèlent jamais les clés de stockage : elles redirigent
// vers une URL signée courte durée après contrôle d'appartenance au tenant.
router.get('/media/:tenantId/logo', brandingMediaController.publicMedia);
router.get('/media/:tenantId/avatar/:userId', brandingMediaController.publicMedia);

// Rate limiting spécifique pour le widget (plus restrictif que l'API privée)
const widgetMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // 15 messages par minute par IP
  message: {
    success: false,
    error: 'Trop de messages envoyés. Veuillez patienter avant de continuer.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const widgetGeneralLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requêtes par 5 minutes
  message: {
    success: false,
    error: 'Trop de requêtes. Veuillez patienter.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const widgetFeedbackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Trop de feedbacks envoyés. Veuillez patienter.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de validation du tenant pour le widget
const validateWidgetTenant = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID requis dans le header X-Tenant-ID',
        code: 'MISSING_TENANT_ID'
      });
    }

    // Valider le format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: 'Format de Tenant ID invalide',
        code: 'INVALID_TENANT_ID'
      });
    }

    // Utiliser le middleware existant pour charger le tenant
    await extractTenantFromRequest(req, res, next);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation du tenant',
      code: 'TENANT_VALIDATION_ERROR'
    });
  }
};

router.use(validateWidgetTenant, widgetOriginGuard, widgetAppIdGuard);

// Jetons de notification mobiles (voir mobile/CONTRACT.md). Peu fréquent : un appel par session.
const widgetPushLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de requêtes. Veuillez patienter.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/push-token', widgetPushLimiter, async (req, res, next) => {
  try {
    const data = await mobilePushService.registerDevice(req.tenant, {
      sessionId: req.body?.sessionId, token: req.body?.token, platform: req.body?.platform,
      locale: req.body?.locale, appId: req.get('X-App-Id'),
    });
    return successResponse(res, data, 'Jeton enregistré');
  } catch (error) { return next(error); }
});

router.delete('/push-token', widgetPushLimiter, async (req, res, next) => {
  try {
    return successResponse(res, await mobilePushService.unregisterDevice(req.tenant, req.body?.token), 'Jeton supprimé');
  } catch (error) { return next(error); }
});

// Middleware pour ajouter des métadonnées widget
const addWidgetMetadata = (req, res, next) => {
  req.widgetMetadata = {
    source: 'widget',
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    referrer: req.get('Referer'),
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  };
  next();
};

// ===== ROUTES PUBLIQUES POUR LE WIDGET =====

// Envoyer un message via le widget
router.post('/message',
  widgetMessageLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, next) => {
    try {
      const { userId, metadata = {} } = req.body;

      const invalid = validateMessageBody(req.body, requestLocale(req));
      if (invalid) return res.status(400).json({ success: false, ...invalid });

      // Enrichir les métadonnées avec les informations du widget
      req.body.metadata = {
        ...metadata,
        ...req.widgetMetadata,
        locale: req.locale,
        widget: {
          version: '1.0.0',
          tenantId: req.tenant.id,
          tenantName: req.tenant.name
        }
      };

      // Ajouter l'ID utilisateur widget si pas fourni
      if (!userId) {
        req.body.userId = `widget-${req.ip.replace(/\./g, '-')}-${Date.now()}`;
      }

      // Utiliser le contrôleur de chat existant
      await sendMessage(req, res, next);
    } catch (error) {
      console.error('Erreur widget/message:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du traitement du message',
        code: 'MESSAGE_PROCESSING_ERROR'
      });
    }
  }
);

// Envoi de pièces jointes : POST /widget/upload
router.use(widgetAttachmentRoutes([validateWidgetTenant, addWidgetMetadata]));

// Récupérer l'historique d'une conversation (pour restaurer une session)
router.get('/conversation/:sessionId',
  widgetGeneralLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, next) => {
    try {
      const { limit = 50 } = req.query;

      // Limiter pour le widget public
      if (parseInt(limit) > 100) {
        req.query.limit = 100;
      }

      await getConversationHistory(req, res, next);
    } catch (error) {
      console.error('Erreur widget/conversation:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'historique',
        code: 'HISTORY_FETCH_ERROR'
      });
    }
  }
);

// Terminer une conversation avec feedback optionnel
router.post('/conversation/:sessionId/end',
  widgetGeneralLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, next) => {
    try {
      const { rating, feedback } = req.body;

      // Validation du rating
      if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          error: 'Rating doit être entre 1 et 5',
          code: 'INVALID_RATING'
        });
      }

      if (feedback != null && (typeof feedback !== 'string' || feedback.length > 1000)) {
        return res.status(400).json({
          success: false,
          error: 'Le commentaire doit contenir au maximum 1000 caractères',
          code: 'INVALID_FEEDBACK'
        });
      }

      // Enrichir avec les métadonnées de fin
      req.body.metadata = {
        ...req.widgetMetadata,
        endedBy: 'user',
        endedVia: 'widget',
        widget: {
          sessionDuration: req.body.sessionDuration || null,
          messageCount: req.body.messageCount || null
        }
      };

      await endConversation(req, res, next);
    } catch (error) {
      console.error('Erreur widget/end-conversation:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la fermeture de la conversation',
        code: 'END_CONVERSATION_ERROR'
      });
    }
  }
);

// Flux temps réel du fil : le widget utilise fetch pour conserver X-Tenant-ID.

// Clôture déclenchée après les relances d'inactivité du widget. Le motif est
// fixé par cette route, et ne peut donc pas être imposé par le client.
router.post('/conversation/:sessionId/timeout',
  widgetGeneralLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, next) => {
    try {
      req.conversationEndReason = 'inactivity';
      req.body.metadata = {
        ...req.widgetMetadata,
        endedVia: 'widget',
        widget: {
          sessionDuration: req.body.sessionDuration || null,
          messageCount: req.body.messageCount || null,
        },
      };
      await endConversation(req, res, next);
    } catch (error) {
      console.error('Erreur widget/timeout-conversation:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la clôture automatique de la conversation',
        code: 'INACTIVITY_END_ERROR',
      });
    }
  }
);

router.post('/conversation/:sessionId/message-feedback',
  widgetFeedbackLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, next) => {
    try {
      const { messageId, messageIndex, value } = req.body;
      const hasMessageId = typeof messageId === 'string' && messageId.length > 0 && messageId.length <= 100;
      const hasMessageIndex = Number.isInteger(messageIndex) && messageIndex >= 0;

      if (!hasMessageId && !hasMessageIndex) {
        return res.status(400).json({
          success: false,
          error: 'messageId ou messageIndex est requis',
          code: 'MISSING_MESSAGE_TARGET'
        });
      }
      if (!['up', 'down', null].includes(value)) {
        return res.status(400).json({
          success: false,
          error: 'value doit être up, down ou null',
          code: 'INVALID_FEEDBACK_VALUE'
        });
      }

      await submitMessageFeedback(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Obtenir la configuration du tenant pour le widget (ROUTE PUBLIQUE)
router.get('/config',
  widgetGeneralLimiter,
  validateWidgetTenant,
  async (req, res, next) => {
    try {
      const tenant = req.tenant;

      if (!tenant || !tenant.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Tenant non trouvé ou inactif',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Récupérer les paramètres du chatbot
      const chatbotSettings = tenant.settings?.chatbot || {};
      const localized = resolveLocalizedContent(chatbotSettings, req.locale);

      // Retourner seulement les paramètres publics
      const publicConfig = {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subscriptionPlan: tenant.subscriptionPlan
        },
        chatbot: {
          name: chatbotSettings.name || 'Assistant',
          welcomeMessage: localized.welcomeMessage,
          locale: localized.locale,
          theme: {
            primaryColor: chatbotSettings.theme?.primaryColor || '#3b82f6',
            textColor: chatbotSettings.theme?.textColor || '#333333',
            position: chatbotSettings.theme?.position || 'bottom-right'
          },
          features: {
            analytics: chatbotSettings.features?.analytics || false,
            customBranding: chatbotSettings.features?.customBranding || false,
            autoResponseSuggestions: chatbotSettings.features?.autoResponseSuggestions ?? true
          },
          options: {
            enableMarkdown: chatbotSettings.options?.enableMarkdown ?? true,
            ui: {
              ...(chatbotSettings.options?.ui?.colorScheme !== undefined
                ? { colorScheme: chatbotSettings.options.ui.colorScheme }
                : {}),
              ...(chatbotSettings.options?.ui?.avatarUrl !== undefined
                ? { avatarUrl: chatbotSettings.options.ui.avatarUrl }
                : {}),
              ...(chatbotSettings.options?.ui?.avatarPreset !== undefined
                ? { avatarPreset: chatbotSettings.options.ui.avatarPreset }
                : {}),
              ...(chatbotSettings.options?.ui?.launcherIconUrl !== undefined
                ? { launcherIconUrl: chatbotSettings.options.ui.launcherIconUrl }
                : {})
            },
            features: {
              messageFeedback: chatbotSettings.options?.features?.messageFeedback ?? true,
              conversationRating: chatbotSettings.options?.features?.conversationRating ?? true,
              showTimestamps: chatbotSettings.options?.features?.showTimestamps ?? true,
              showDeliveryStatus: chatbotSettings.options?.features?.showDeliveryStatus ?? true,
              dateSeparators: chatbotSettings.options?.features?.dateSeparators ?? true,
              connectivityStatus: chatbotSettings.options?.features?.connectivityStatus ?? true,
              attachments: chatbotSettings.options?.features?.attachments ?? true,
              liveTypingPreview: chatbotSettings.options?.features?.liveTypingPreview ?? false
            },
            attachments: {
              maxFiles: MAX_ATTACHMENTS_PER_MESSAGE,
              maxBytes: MAX_FILE_BYTES
            }
          }
        }
      };

      res.json({
        success: true,
        data: publicConfig,
        message: 'Configuration récupérée avec succès'
      });
    } catch (error) {
      console.error('Erreur widget/config:', error);
      next(error);
    }
  }
);

// Health check pour le widget
router.get('/health',
  (req, res) => {
    const healthData = {
      status: 'healthy',
      service: 'ChatBot Widget API',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        messaging: true,
        history: true,
        feedback: true,
        configuration: true
      }
    };

    // Ajouter des informations de santé détaillées si demandées
    if (req.query.detailed === 'true') {
      healthData.system = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      };
    }

    successResponse(res, healthData, 'Widget API is healthy');
  }
);

// Test de connectivité spécifique au widget avec tenant
router.get('/test',
  widgetGeneralLimiter,
  validateWidgetTenant,
  async (req, res, _next) => {
    try {
      const tenant = req.tenant;

      // Test de base de l'API
      const testResult = {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          isActive: tenant.isActive,
          subscriptionPlan: tenant.subscriptionPlan
        },
        widget: {
          status: 'operational',
          features: {
            chat: true,
            history: true,
            feedback: true,
            configuration: true
          },
          apiEndpoint: req.get('host'),
          rateLimits: {
            messagesPerMinute: 15,
            requestsPer5Minutes: 100
          }
        },
        connectivity: {
          database: true, // Simplifié - le fait qu'on arrive ici signifie que ça marche
          ai: openaiService.isAvailable()
        },
        timestamp: new Date().toISOString()
      };

      // Test optionnel de l'IA
      if (req.query.testAI === 'true' && testResult.connectivity.ai) {
        try {
          const aiTest = await openaiService.testConnection();
          testResult.aiTest = {
            success: true,
            model: aiTest.model,
            responseTime: Date.now() - parseInt(req.query.startTime || Date.now())
          };
        } catch (aiError) {
          testResult.aiTest = {
            success: false,
            error: aiError.message
          };
          testResult.connectivity.ai = false;
        }
      }

      successResponse(res, testResult, 'Widget test successful');
    } catch (error) {
      console.error('Erreur widget/test:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du test du widget',
        code: 'WIDGET_TEST_ERROR',
        details: error.message
      });
    }
  }
);

// Route pour obtenir les suggestions de réponses rapides
router.get('/quick-replies',
  widgetGeneralLimiter,
  validateWidgetTenant,
  async (req, res, _next) => {
    try {
      const tenant = req.tenant;
      const { category } = req.query;

      let suggestions = [];
      const localized = resolveLocalizedContent(tenant.settings?.chatbot, req.locale);

      // 1. Si le propriétaire a défini ses propres suggestions, on les utilise
      if (
        (!category || category === 'greeting') &&
        localized.initialQuestions.length > 0
      ) {
        suggestions = localized.initialQuestions;
      }
      // 2. Sinon, si c'est l'accueil, on laisse l'IA générer et on sauvegarde silencieusement
      else if (!category || category === 'greeting') {
        suggestions = await openaiService.generateInitialSuggestions(tenant.id);

        // Sauvegarde silencieuse pour amoindrir les coûts
        if (suggestions && suggestions.length > 0) {
          const currentSettings = tenant.settings || {};
          const currentChatbotSettings = currentSettings.chatbot || {};

          const newSettings = {
            ...currentSettings,
            chatbot: {
              ...currentChatbotSettings,
              initialQuestions: suggestions
            }
          };

          // Dans Sequelize, pour forcer update du JSONB, on réaffecte l'objet
          await tenant.update({ settings: newSettings });
        }
      }

      // 3. Fallback par défaut si l'IA a échoué ou autres catégories
      if (!suggestions || suggestions.length === 0) {
        switch (category) {
          case 'support':
            suggestions = [
              'J\'ai un problème technique',
              `Comment puis-je contacter le support ${tenant.name} ?`,
              'Où puis-je trouver de la documentation ?'
            ];
            break;
          case 'pricing':
            suggestions = [
              'Quels sont vos tarifs ?',
              'Y a-t-il un plan gratuit ?',
              'Comment puis-je mettre à niveau ?'
            ];
            break;
          default:
            suggestions = [
              'Que proposez-vous ?',
              'Avez-vous un guide de démarrage ?',
              'Puis-je parler à quelqu\'un ?'
            ];
        }
      }

      successResponse(res, {
        suggestions,
        category: category || 'general',
        tenant: tenant.name
      }, 'Suggestions récupérées');

    } catch (error) {
      console.error('Erreur widget/quick-replies:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des suggestions',
        code: 'SUGGESTIONS_ERROR'
      });
    }
  }
);

// Route pour signaler un problème avec le widget
router.post('/report-issue',
  widgetGeneralLimiter,
  validateWidgetTenant,
  addWidgetMetadata,
  async (req, res, _next) => {
    try {
      const { issueType, description, sessionId } = req.body;

      if (!issueType || !description) {
        return res.status(400).json({
          success: false,
          error: 'Type d\'issue et description requis',
          code: 'MISSING_ISSUE_DATA'
        });
      }

      // Log de l'issue pour monitoring
      console.warn('🚨 Widget Issue Reported:', {
        tenantId: req.tenant.id,
        tenantName: req.tenant.name,
        issueType,
        description: description.slice(0, 200), // Limiter pour les logs
        sessionId,
        metadata: req.widgetMetadata,
        timestamp: new Date().toISOString()
      });

      // Dans un vrai système, on pourrait sauvegarder en DB ou envoyer à un service de monitoring
      // await saveIssueReport({ tenantId: req.tenant.id, issueType, description, ... });

      successResponse(res, {
        reportId: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: 'Problème signalé avec succès',
        status: 'received'
      }, 'Issue reportée');

    } catch (error) {
      console.error('Erreur widget/report-issue:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du signalement',
        code: 'REPORT_ERROR'
      });
    }
  }
);

// Middleware pour gérer les erreurs spécifiques au widget
router.use((error, req, res, _next) => {
  const missingConversation = error.isOperational
    && error.statusCode === 404
    && error.code === 'CONVERSATION_NOT_FOUND';

  if (missingConversation) {
    if (process.env.NODE_ENV === 'development') {
      console.info('Widget conversation absente:', {
        tenantId: req.tenant?.id,
        sessionId: req.params?.sessionId,
      });
    }
  } else {
    console.error('Widget Route Error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      tenantId: req.tenant?.id,
      ip: req.ip
    });
  }

  // Une AppError porte déjà un statut, un code et un message français destiné
  // à l'utilisateur : on la relaie telle quelle.
  // Attention : `AppError.status` vaut 'fail'/'error', ce n'est pas un code
  // HTTP — c'est `statusCode` qu'il faut lire.
  if (error.isOperational && Number.isInteger(error.statusCode)) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code || 'WIDGET_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Réponse d'erreur formatée pour le widget
  const errorResponse = {
    success: false,
    error: 'Une erreur est survenue',
    code: 'WIDGET_ERROR',
    timestamp: new Date().toISOString()
  };

  // Messages d'erreur spécifiques selon le type
  if (error.message.includes('timeout')) {
    errorResponse.error = 'Timeout: Réponse trop lente';
    errorResponse.code = 'TIMEOUT_ERROR';
    errorResponse.suggestion = 'Veuillez réessayer dans quelques instants';
  } else if (error.message.includes('rate limit')) {
    errorResponse.error = 'Trop de requêtes';
    errorResponse.code = 'RATE_LIMIT_ERROR';
    errorResponse.suggestion = 'Patientez quelques instants avant de continuer';
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
});

module.exports = router;
