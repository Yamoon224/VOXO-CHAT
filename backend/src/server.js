// src/server.js
const app = require('./app');
const config = require('./config/config');
const { testConnection, sequelize } = require('./config/database');
const { testRedisConnection } = require('./config/redis');
const mediaStorageService = require('./services/mediaStorageService');
const storageService = require('./services/storageService');
const advancedPDFService = require('./services/advancedPDFService');
const pdfCatalogRenderer = require('./services/pdfCatalogRenderer');
const { registerConversationSockets } = require('./services/conversationSocketService');
const { registerSupportSockets } = require('./services/supportSocketService');
const { registerNotificationSockets } = require('./services/notificationSocketService');
const { registerConversationListSockets } = require('./services/conversationListSocketService');
const { attachSocketRouter } = require('./services/socketRouterService');

const checkAttachmentStorage = async () => {
  const status = await storageService.checkAvailability();
  if (!status.available) {
    console.warn('⚠️ Stockage des pièces jointes indisponible', { reason: status.reason });
    return;
  }
  if (status.isPublic) {
    console.warn('⚠️ Le bucket des pièces jointes doit rester privé');
    return;
  }
  console.log('✅ Stockage privé des pièces jointes disponible');
};

/* 
// Code commenté selon demande : Test de la connexion Redis local
const testRedisConnection = async () => {
  try {
    const Redis = require('ioredis');
    const redis = new Redis(config.redis.url);
    
    await redis.ping();
    console.log('✅ Connexion à Redis établie avec succès');
    redis.disconnect();
  } catch (error) {
    console.error('❌ Erreur de connexion à Redis:', error.message);
    throw error;
  }
};
*/

// Fonction de démarrage du serveur
const startServer = async () => {
  try {
    // console.log('🚀 Démarrage du serveur...');
    // console.log(`📊 Environnement: ${config.env}`);

    await mediaStorageService.purgeStale();

    // Test des connexions aux bases de données
    console.log('🔌 Test des connexions...');
    await testConnection(); // PostgreSQL
    // await testRedisConnection(); // Redis (ancien test local commenté)
    await testRedisConnection(); // Nouveau test centralisé
    await checkAttachmentStorage();
    const pdfHealth = await advancedPDFService.healthCheck();
    if (!pdfHealth.rendererAvailable) {
      console.warn('⚠️ Moteur de rendu PDF absent : les PDF scannés ne pourront pas être OCRisés.');
    }
    if (!(await pdfCatalogRenderer.healthCheck())) {
      console.warn('⚠️ Moteur PDF.js/Canvas indisponible : les catalogues PDF ne pourront pas être analysés.');
    }

    // Synchronisation de la base de données (development seulement)
    // if (config.env === 'development') {
    //   console.log('🔄 Synchronisation de la base de données...');
    //   await sequelize.sync({ alter: true });
    //   console.log('✅ Base de données synchronisée');
    // }

    // Démarrage du serveur HTTP
    const server = app.listen(config.port, () => {
      console.log(`\n🎉 Serveur démarré avec succès!`);
      console.log(`📍 URL: http://localhost:${config.port}`);
      console.log(`🔍 Health check: http://localhost:${config.port}/health`);
      console.log(`📚 API Base: http://localhost:${config.port}/api`);
      console.log(`📚 Swagger: http://localhost:${config.port}/api-docs`);
      // console.log(`\n📋 Routes disponibles:`);
      // console.log(`   • POST /api/auth/register - Créer un compte`);
      // console.log(`   • POST /api/auth/login - Se connecter`);
      // console.log(`   • GET  /api/tenant/profile - Profil tenant`);
      // console.log(`   • GET  /api/knowledge - Base de connaissances`);
      // console.log(`   • POST /api/chat/message - Envoyer un message`);
      // console.log(`\n⚡ Prêt à recevoir des requêtes!\n`);
    });
    registerConversationSockets();
    registerSupportSockets();
    registerNotificationSockets();
    registerConversationListSockets();
    attachSocketRouter(server);

    // Configuration du timeout du serveur
    server.timeout = 30000; // 30 secondes

    // Gestion propre de l'arrêt du serveur
    const gracefulShutdown = () => {
      console.log('\n🛑 Arrêt du serveur en cours...');

      server.close(async () => {
        console.log('📴 Serveur HTTP fermé');

        try {
          // Fermer la connexion à la base de données
          await sequelize.close();
          console.log('📴 Connexion PostgreSQL fermée');

          console.log('✅ Arrêt propre terminé');
          process.exit(0);
        } catch (error) {
          console.error('❌ Erreur lors de l\'arrêt:', error);
          process.exit(1);
        }
      });

      // Forcer l'arrêt après 10 secondes
      setTimeout(() => {
        console.error('⚠️  Arrêt forcé après timeout');
        process.exit(1);
      }, 10000);
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveu
startServer();
