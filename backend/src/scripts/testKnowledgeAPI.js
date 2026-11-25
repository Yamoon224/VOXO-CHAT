// backend/src/scripts/testKnowledgeAPI.js - Version corrigée
require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const testConfig = {
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
  tenantId: null,
  accessToken: null
};

class KnowledgeAPITest {
  constructor() {
    this.apiClient = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Intercepteur pour debug des erreurs
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        console.error('❌ Erreur API détaillée:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        });
        return Promise.reject(error);
      }
    );
  }

  // Test de connexion au serveur avant authentification
  async testServerConnection() {
    try {
      console.log('🔗 Test de connexion au serveur...');
      const response = await this.apiClient.get('/');
      console.log('✅ Serveur accessible:', response.data.message);
      return true;
    } catch (error) {
      console.error('❌ Serveur inaccessible:', error.message);
      return false;
    }
  }

  // Authentification avec gestion d'erreur détaillée
  async authenticate() {
    try {
      console.log('🔐 Tentative d\'authentification...');
      console.log(`   Email: ${testConfig.email}`);
      
      const response = await this.apiClient.post('/auth/login', {
        email: testConfig.email,
        password: testConfig.password
      });

      if (response.data && response.data.success) {
        testConfig.accessToken = response.data.data.tokens.accessToken;
        testConfig.tenantId = response.data.data.tenant.id;

        // Configurer l'intercepteur pour ajouter le token
        this.apiClient.interceptors.request.use((config) => {
          if (testConfig.accessToken) {
            config.headers.Authorization = `Bearer ${testConfig.accessToken}`;
          }
          if (testConfig.tenantId) {
            config.headers['X-Tenant-ID'] = testConfig.tenantId;
          }
          return config;
        });

        console.log('✅ Authentification réussie');
        console.log(`   Tenant: ${response.data.data.tenant.name}`);
        return true;
      } else {
        console.error('❌ Réponse d\'authentification invalide:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Suggestions de correction
      if (error.response?.status === 401) {
        console.log('\n💡 SUGGESTIONS :');
        console.log('   1. Vérifiez que l\'email et mot de passe sont corrects');
        console.log('   2. Créez un compte de test via l\'interface web');
        console.log('   3. Ou utilisez vos vrais identifiants dans testConfig');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 SUGGESTIONS :');
        console.log('   1. Démarrez le serveur: npm run dev');
        console.log('   2. Vérifiez que le port 3000 est libre');
      } else if (error.response?.data?.error?.includes('Database')) {
        console.log('\n💡 SUGGESTIONS :');
        console.log('   1. Vérifiez la connexion à Supabase dans .env');
        console.log('   2. Testez: npm run test:connections');
        console.log('   3. Vérifiez que DATABASE_URL est correct');
      }

      return false;
    }
  }

  // Créer un compte de test si nécessaire
  async createTestAccount() {
    try {
      console.log('🔧 Création d\'un compte de test...');
      
      const testData = {
        // Données entreprise
        companyName: 'Test Company API',
        subscriptionPlan: 'free',
        
        // Données utilisateur
        firstName: 'Test',
        lastName: 'API',
        email: testConfig.email,
        password: testConfig.password,
        confirmPassword: testConfig.password
      };

      const response = await this.apiClient.post('/auth/register', testData);
      
      if (response.data && response.data.success) {
        console.log('✅ Compte de test créé avec succès');
        return true;
      } else {
        console.error('❌ Erreur lors de la création du compte:', response.data);
        return false;
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('existe déjà')) {
        console.log('ℹ️  Le compte existe déjà, tentative de connexion...');
        return true;
      } else {
        console.error('❌ Erreur création compte:', error.response?.data || error.message);
        return false;
      }
    }
  }

  // Test des statistiques
  async testGetStats() {
    try {
      console.log('\n📊 Test: Récupération des statistiques...');
      
      const response = await this.apiClient.get('/knowledge/stats');
      
      console.log('✅ Statistiques récupérées:');
      console.log('  - Total:', response.data.data.total);
      console.log('  - Actives:', response.data.data.active);
      console.log('  - Avec embedding:', response.data.data.withEmbedding);
      console.log('  - Types de sources:', response.data.data.bySourceType.length);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur stats:', error.response?.data || error.message);
      return false;
    }
  }

  // Test de création manuelle
  async testCreateManual() {
    try {
      console.log('\n✍️  Test: Création manuelle...');
      
      const knowledge = {
        title: 'Test Connaissance Manuelle',
        content: 'Ceci est un test de création manuelle d\'une connaissance. Le contenu est suffisamment long pour être valide et contient des informations utiles pour le chatbot.',
        sourceType: 'manual',
        tags: ['test', 'manuel', 'demo'],
        isActive: true
      };

      const response = await this.apiClient.post('/knowledge', knowledge);
      
      console.log('✅ Connaissance manuelle créée:', response.data.data.id);
      return response.data.data.id;
    } catch (error) {
      console.error('❌ Erreur création manuelle:', error.response?.data || error.message);
      return null;
    }
  }

  // Test complet avec gestion d'erreur améliorée
  async runAllTests() {
    console.log('🚀 Démarrage des tests Knowledge API\n');

    if (!testConfig.email || !testConfig.password) {
      throw new Error('TEST_USER_EMAIL et TEST_USER_PASSWORD sont requis');
    }
    
    const results = {
      passed: 0,
      failed: 0,
      total: 0
    };

    const runTest = async (testName, testFunction, ...args) => {
      results.total++;
      try {
        const result = await testFunction.apply(this, args);
        if (result) {
          results.passed++;
          return result;
        } else {
          results.failed++;
          return null;
        }
      } catch (error) {
        console.error(`❌ ${testName} échoué:`, error.message);
        results.failed++;
        return null;
      }
    };

    // 1. Test de connexion serveur
    if (!(await runTest('Connexion serveur', this.testServerConnection))) {
      console.log('❌ Arrêt des tests - Serveur inaccessible');
      return;
    }

    // 2. Test d'authentification
    let authSuccess = await runTest('Authentification', this.authenticate);
    
    // 3. Si échec, tenter de créer un compte
    if (!authSuccess) {
      console.log('\n🔧 Tentative de création d\'un compte de test...');
      if (await runTest('Création compte test', this.createTestAccount)) {
        authSuccess = await runTest('Authentification (retry)', this.authenticate);
      }
    }

    if (!authSuccess) {
      console.log('❌ Arrêt des tests - Authentification échouée');
      console.log('\n💡 SOLUTION RAPIDE :');
      console.log('   1. Définissez TEST_USER_EMAIL et TEST_USER_PASSWORD');
      console.log('   2. Relancez le script avec un compte de test dédié');
      return;
    }

    // Tests de l'API Knowledge
    await runTest('Statistiques', this.testGetStats);
    await runTest('Création manuelle', this.testCreateManual);
    
    // Résumé
    console.log('\n📋 RÉSUMÉ DES TESTS');
    console.log('==================');
    console.log(`✅ Tests réussis: ${results.passed}/${results.total}`);
    console.log(`❌ Tests échoués: ${results.failed}/${results.total}`);
    console.log(`📊 Taux de réussite: ${Math.round((results.passed / results.total) * 100)}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    } else {
      console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    }
  }
}

// Exécution des tests
if (require.main === module) {
  const tester = new KnowledgeAPITest();
  tester.runAllTests().catch(console.error);
}

module.exports = KnowledgeAPITest;
