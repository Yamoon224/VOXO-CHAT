// src/scripts/testOpenAI.js
const axios = require('axios');
const openaiService = require('../services/openaiService');

const BASE_URL = 'http://localhost:3000/api';

class OpenAITester {
  constructor() {
    this.tenant = null;
    this.accessToken = null;
  }

  async setupTestEnvironment() {
    console.log('🔧 Configuration de l\'environnement de test...');
    
    try {
      // Créer un compte de test
      const registerData = {
        companyName: 'Test AI Company',
        subdomain: `testai${Date.now()}`,
        firstName: 'IA',
        lastName: 'Tester',
        email: `ia.test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };

      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      this.tenant = registerResponse.data.data.tenant;
      this.accessToken = registerResponse.data.data.tokens.accessToken;
      
      console.log('✅ Environnement de test créé');
      console.log(`   Tenant: ${this.tenant.name}`);
      console.log(`   ID: ${this.tenant.id}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la configuration:', error.response?.data || error.message);
      return false;
    }
  }

  async testOpenAIConnection() {
    console.log('\n🤖 Test de la connexion OpenAI...');
    
    try {
      const response = await axios.get(`${BASE_URL}/chat/test-openai`, {
        headers: { 'X-Tenant-ID': this.tenant.id }
      });
      
      console.log('✅ Connexion OpenAI réussie');
      console.log('   Modèles disponibles:', response.data.data.models.join(', '));
      
      return true;
    } catch (error) {
      console.error('❌ Test OpenAI échoué:', error.response?.data || error.message);
      return false;
    }
  }

  async testDirectService() {
    console.log('\n🔧 Test direct du service OpenAI...');
    
    try {
      if (!openaiService.isAvailable()) {
        console.log('⚠️  Service OpenAI non disponible (clé API manquante)');
        return false;
      }

      const testResult = await openaiService.testConnection();
      console.log('✅ Service OpenAI fonctionnel');
      console.log('   Modèles:', testResult.models.join(', '));
      
      return true;
    } catch (error) {
      console.error('❌ Service OpenAI en erreur:', error.message);
      return false;
    }
  }

  async testChatMessage() {
    console.log('\n💬 Test d\'envoi de message...');
    
    try {
      const messageData = {
        message: 'Bonjour ! Comment allez-vous ?',
        userId: 'test-user',
        metadata: {
          source: 'test',
        }
      };

      const response = await axios.post(`${BASE_URL}/chat/message`, messageData, {
        headers: { 'X-Tenant-ID': this.tenant.id }
      });
      
      console.log('✅ Message envoyé avec succès');
      console.log('   Réponse IA:', response.data.data.response.substring(0, 100) + '...');
      console.log('   Session ID:', response.data.data.sessionId);
      console.log('   Modèle utilisé:', response.data.data.metadata.model);
      
      // Stocker la session pour les tests suivants
      this.sessionId = response.data.data.sessionId;
      
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi message:', error.response?.data || error.message);
      return false;
    }
  }

  async testConversationFlow() {
    console.log('\n🗣️  Test de conversation complète...');
    
    try {
      const messages = [
        'Bonjour !',
        'Quels sont vos services ?',
        'Merci pour les informations',
        'Au revoir !'
      ];

      for (let i = 0; i < messages.length; i++) {
        console.log(`   📤 Envoi: "${messages[i]}"`);
        
        const response = await axios.post(`${BASE_URL}/chat/message`, {
          message: messages[i],
          sessionId: this.sessionId,
          userId: 'test-conversation-user'
        }, {
          headers: { 'X-Tenant-ID': this.tenant.id }
        });
        
        const aiResponse = response.data.data.response;
        console.log(`   📥 Réponse: "${aiResponse.substring(0, 80)}..."`);
        
        // Petite pause entre les messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Conversation complète testée');
      return true;
    } catch (error) {
      console.error('❌ Erreur dans la conversation:', error.response?.data || error.message);
      return false;
    }
  }

  async testConversationHistory() {
    console.log('\n📚 Test de l\'historique de conversation...');
    
    try {
      const response = await axios.get(`${BASE_URL}/chat/conversation/${this.sessionId}`, {
        headers: { 
          'X-Tenant-ID': this.tenant.id,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      const messages = response.data.data.messages;
      console.log('✅ Historique récupéré');
      console.log(`   Nombre de messages: ${messages.length}`);
      console.log(`   Premier message: "${messages[0]?.content.substring(0, 50)}..."`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 TESTS D\'INTÉGRATION OPENAI\n');
    
    const tests = [
      { name: 'Configuration environnement', fn: this.setupTestEnvironment },
      { name: 'Service OpenAI direct', fn: this.testDirectService },
      { name: 'Connexion OpenAI API', fn: this.testOpenAIConnection },
      { name: 'Envoi de message', fn: this.testChatMessage },
      { name: 'Conversation complète', fn: this.testConversationFlow },
      { name: 'Historique conversation', fn: this.testConversationHistory },
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.fn.call(this);
        results.push({ name: test.name, success: result });
      } catch (error) {
        console.error(`❌ Erreur dans ${test.name}:`, error.message);
        results.push({ name: test.name, success: false });
      }
    }

    // Résumé des résultats
    console.log('\n📊 RÉSUMÉ DES TESTS OPENAI');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Réussis: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
    
    if (successful === total) {
      console.log('🎉 Tous les tests OpenAI sont passés !');
      console.log('💡 Votre chatbot IA est prêt à fonctionner !');
    } else {
      console.log('⚠️  Certains tests ont échoué. Vérifiez votre configuration OpenAI.');
      
      if (!openaiService.isAvailable()) {
        console.log('\n🔑 CONFIGURATION OPENAI REQUISE:');
        console.log('1. Obtenez une clé API sur https://platform.openai.com/api-keys');
        console.log('2. Modifiez votre fichier .env:');
        console.log('   OPENAI_API_KEY=sk-votre-clé-ici');
        console.log('3. Redémarrez le serveur: npm run dev');
      }
    }
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  const tester = new OpenAITester();
  tester.runAllTests().catch(console.error);
}

module.exports = OpenAITester;