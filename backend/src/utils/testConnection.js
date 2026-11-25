// src/utils/testConnection.js
const { testConnection } = require('../config/database');
const { createRedisClient, closeRedisConnection } = require('../config/redis');
const config = require('../config/config');

const testAllConnections = async () => {
  console.log('🧪 Test des connexions...\n');

  try {
    // Test PostgreSQL
    console.log('📊 Test PostgreSQL...');
    await testConnection();
    
    // Test Redis via le client centralisé : hérite de REDIS_PASSWORD et du TLS
    console.log('📦 Test Redis...');
    const redis = createRedisClient();
    await redis.connect();
    await redis.ping();
    console.log('✅ Redis: OK');
    await closeRedisConnection();

    // Test OpenAI (si la clé est configurée)
    if (config.openai.apiKey && config.openai.apiKey !== 'sk-your-openai-api-key-here') {
      console.log('🤖 Test OpenAI...');
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: config.openai.apiKey });
      
      // Test simple
      await openai.models.list();
      console.log('✅ OpenAI: OK');
    } else {
      console.log('⚠️  OpenAI: Clé API non configurée');
    }
    
    console.log('\n🎉 Tous les tests de connexion sont passés!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test des connexions:', error.message);
    process.exit(1);
  }
};

// Exécuter si appelé directement
if (require.main === module) {
  testAllConnections();
}

module.exports = testAllConnections;