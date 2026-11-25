// backend/src/app.js - Version mise à jour avec support widget
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const { isRedisReady } = require('./config/redis');
const storageService = require('./services/storageService');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import des middlewares personnalisés
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { extractTenantFromRequest } = require('./middleware/tenantMiddleware');
const { resolveLocale } = require('./middleware/localeMiddleware');
const {
  createSwaggerBasicAuth,
  createSwaggerRedirect,
} = require('./middleware/swaggerMiddleware');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const integrationController = require('./controllers/integrationController');
const chatRoutes = require('./routes/chatRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const publicPlanRoutes = require('./routes/publicPlanRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { tenantNotificationRoutes, adminNotificationRoutes } = require('./routes/notificationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const accountSecurityRoutes = require('./routes/accountSecurityRoutes');
const accountDeletionRoutes = require('./routes/accountDeletionRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Créer l'application Express
const app = express();
app.set('trust proxy', 1);

// ===== MIDDLEWARE DE BASE =====
app.use(helmet({
  contentSecurityPolicy: false, // Désactiver pour permettre l'intégration du widget
  crossOriginEmbedderPolicy: false
}));

// Configuration CORS étendue pour le widget
app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Permettre les domaines configurés
    const allowedOrigins = config.cors.allowedOrigins || [];

    // En développement, permettre localhost sur tous les ports
    if (config.env === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Vérifier les domaines autorisés
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Pour le widget, permettre tous les domaines (à ajuster selon vos besoins)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Tenant-ID' // Header spécifique pour le widget
  ]
}));

app.use(express.json({
  // Un média binaire de 10 Mo occupe environ 13,4 Mo une fois encodé en base64.
  limit: Math.ceil((config.media.maxBytes * 4) / 3) + (1024 * 1024),
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(resolveLocale);

if (config.env === 'development') {
  app.use(morgan('dev'));
}

// ===== ROUTES DE SANTÉ =====
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    services: {
      api: 'operational',
      widget: 'operational',
      // Statut réel du cache, sans I/O : aucune route ne dépend de Redis,
      // donc une panne est signalée ici sans faire échouer le healthcheck.
      redis: isRedisReady() ? 'operational' : 'unavailable',
      storage: storageService.getAvailabilityStatus().available ? 'operational' : 'unavailable'
    }
  });
});

// ===== ROUTE DE TEST API =====
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API Chatbot SaaS avec Widget',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      // Routes API privées (dashboard)
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        refreshToken: 'POST /api/auth/refresh-token'
      },
      tenant: {
        profile: 'GET /api/tenant/profile',
        settings: 'PUT /api/tenant/settings'
      },
      team: {
        members: 'GET /api/team/members',
        invite: 'POST /api/team/invitations',
        acceptInvitation: 'POST /api/auth/invitations/accept'
      },
      knowledge: {
        list: 'GET /api/knowledge',
        create: 'POST /api/knowledge',
        upload: 'POST /api/knowledge/upload'
      },
      chat: {
        message: 'POST /api/chat/message',
        history: 'GET /api/chat/conversation/:sessionId'
      },
      // Routes publiques du widget
      widget: {
        message: 'POST /api/widget/message',
        config: 'GET /api/widget/config',
        history: 'GET /api/widget/conversation/:sessionId',
        health: 'GET /api/widget/health'
      }
    }
  });
});

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentification et gestion des utilisateurs
 *   - name: Tenants
 *     description: Gestion des entreprises (Tenants)
 *   - name: Team
 *     description: Gestion des membres et invitations
 *   - name: Knowledge
 *     description: Gestion de la base de connaissances
 *   - name: Chat
 *     description: Interface de discussion
 */

// ===== DOCUMENTATION SWAGGER =====
const swaggerBasicAuth = createSwaggerBasicAuth({
  environment: config.env,
  username: config.swagger.username,
  password: config.swagger.password,
});
const redirectSwaggerToTrailingSlash = createSwaggerRedirect({
  backendUrl: config.app.backendUrl,
});

app.get(/^\/api-docs$/, swaggerBasicAuth, redirectSwaggerToTrailingSlash);
app.use('/api-docs', swaggerBasicAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===== ROUTES PUBLIQUES =====
app.use('/api/auth', invitationRoutes);
app.use('/api/auth', accountSecurityRoutes);
app.use('/api/auth', accountDeletionRoutes);
app.use('/api/auth', authRoutes);

// ===== ROUTES PUBLIQUES DU WIDGET =====
app.use('/api/public', publicPlanRoutes);
app.use('/api/widget', widgetRoutes);

// ===== ROUTES WEBHOOKS (Omnicanalité) =====
app.use('/api/webhooks', webhookRoutes);

// ===== ROUTES DE LA PLATEFORME D'ADMINISTRATION (transverses aux tenants) =====
app.use('/api/admin', adminRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

// ===== ROUTES AVEC TENANT (API privée) =====
app.use('/api/tenant', extractTenantFromRequest, tenantRoutes);
app.get('/api/integrations/microsoft/callback', integrationController.completeMicrosoft);
app.use('/api/knowledge', extractTenantFromRequest, knowledgeRoutes);
app.use('/api/integrations', extractTenantFromRequest, integrationRoutes);
app.use('/api/chat', extractTenantFromRequest, chatRoutes);
app.use('/api/analytics', extractTenantFromRequest, analyticsRoutes);
app.use('/api/team', extractTenantFromRequest, teamRoutes);
app.use('/api/notifications', extractTenantFromRequest, tenantNotificationRoutes);

// ===== ROUTE DE DISTRIBUTION DU WIDGET =====
// Chemin correct vers le dossier public du backend
const publicDir = path.join(__dirname, '../public');
// console.log('📁 Dossier public backend:', publicDir);
// Ajoutez ceci au début du fichier app.js pour debug
// console.log('📍 Répertoire courant du processus:', process.cwd());
// console.log('📍 Répertoire de ce fichier:', __dirname);
// console.log('📍 Chemin calculé pour public:', path.join(__dirname, '../public'));

// Créer le dossier public s'il n'existe pas
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Dossier public créé');
}

// Servir les fichiers statiques depuis le dossier public
app.use('/public', express.static(publicDir));

// Route spécifique pour le fichier widget.js
app.get('/widget.js', (req, res) => {
  // Chemin vers le widget dans le backend
  const widgetPath = path.join(publicDir, 'widget.js');

  console.log('🔍 Recherche du widget dans:', widgetPath);

  // Vérifier si le fichier existe
  if (!fs.existsSync(widgetPath)) {
    console.log('❌ Widget.js non trouvé dans:', widgetPath);

    // Essayer de trouver le widget dans le dossier widget/dist (fallback)
    const fallbackPath = path.join(__dirname, '../../widget/dist/widget.js');
    console.log('🔍 Recherche fallback dans:', fallbackPath);

    if (fs.existsSync(fallbackPath)) {
      console.log('✅ Widget trouvé en fallback, copie en cours...');
      try {
        fs.copyFileSync(fallbackPath, widgetPath);
        console.log('✅ Widget copié avec succès');
      } catch (copyError) {
        console.error('❌ Erreur lors de la copie:', copyError);
        return res.status(500).json({
          error: 'Erreur lors de la copie du widget',
          details: copyError.message
        });
      }
    } else {
      return res.status(404).json({
        error: 'Widget non trouvé',
        message: 'Le fichier widget.js n\'a pas été généré. Exécutez : cd widget && npm run build',
        searchedPaths: [widgetPath, fallbackPath]
      });
    }
  }

  console.log('✅ Serving widget.js from:', widgetPath);
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 minutes en dev

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  //res.sendFile(path.join(__dirname, '../../../backend/public/widget.js'));
  res.sendFile(widgetPath);
});

// ===== MIDDLEWARE D'ERREURS =====
app.use(notFound);
app.use(errorHandler);

module.exports = app;
