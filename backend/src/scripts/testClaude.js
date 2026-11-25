// backend/src/scripts/testClaude.js
require('dotenv').config();
const claudeService = require('../services/claudeService');

async function testClaudeIntegration() {
  console.log('🤖 TEST D\'INTÉGRATION CLAUDE ANTHROPIC');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Vérifier la disponibilité
    console.log('1️⃣ Vérification de la disponibilité...');
    if (!claudeService.isAvailable()) {
      console.log('❌ Claude service non disponible');
      console.log('💡 Vérifiez que ANTHROPIC_API_KEY est défini dans .env');
      return;
    }
    console.log('✅ Claude service disponible');
    
    // Test 2: Test de connexion basique
    console.log('\n2️⃣ Test de connexion...');
    const connectionTest = await claudeService.testConnection();
    console.log('✅ Connexion Claude réussie');
    console.log(`   Réponse: ${connectionTest.response}`);
    console.log(`   Modèle: ${connectionTest.model}`);
    if (connectionTest.usage) {
      console.log(`   Tokens utilisés: ${connectionTest.usage.input_tokens + connectionTest.usage.output_tokens}`);
    }
    
    // Test 3: Test de génération de réponse simple
    console.log('\n3️⃣ Test de génération de réponse...');
    const simpleResponse = await claudeService.generateChatResponse(
      'test-tenant-id',
      'Bonjour, pouvez-vous me dire quels sont vos services ?',
      [],
      {
        chatbot: {
          name: 'Assistant VOXO',
          welcomeMessage: 'Bonjour ! Je suis votre assistant virtuel.',
          tone: 'professionnel mais amical'
        }
      }
    );
    
    console.log('✅ Réponse générée:');
    console.log(`   Réponse: ${simpleResponse.response.substring(0, 150)}...`);
    console.log(`   Modèle: ${simpleResponse.model}`);
    console.log(`   Sources: ${simpleResponse.sources.length}`);
    if (simpleResponse.tokensUsed) {
      console.log(`   Tokens: ${simpleResponse.tokensUsed}`);
    }
    
    // Test 4: Test avec historique de conversation
    console.log('\n4️⃣ Test avec historique de conversation...');
    const conversationHistory = [
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?' },
      { role: 'user', content: 'Quels sont vos tarifs ?' }
    ];
    
    const contextualResponse = await claudeService.generateChatResponse(
      'test-tenant-id',
      'Et pour le plan premium, quels sont les avantages ?',
      conversationHistory,
      {
        chatbot: {
          name: 'Assistant VOXO',
          tone: 'professionnel'
        }
      }
    );
    
    console.log('✅ Réponse contextuelle générée:');
    console.log(`   Réponse: ${contextualResponse.response.substring(0, 150)}...`);
    
    // Test 5: Test d'analyse de sentiment
    console.log('\n5️⃣ Test d\'analyse de sentiment...');
    const sentiments = [
      'Je suis très satisfait de votre service, c\'est excellent !',
      'Votre chatbot ne fonctionne pas bien, je suis déçu.',
      'Le service est correct, sans plus.'
    ];
    
    for (let i = 0; i < sentiments.length; i++) {
      const sentiment = await claudeService.analyzeSentiment(sentiments[i]);
      console.log(`   Message ${i + 1}: "${sentiments[i].substring(0, 40)}..."`);
      console.log(`   Sentiment: ${sentiment.sentiment} (confiance: ${sentiment.confidence})`);
    }
    
    // Test 6: Test de génération de suggestions
    console.log('\n6️⃣ Test de génération de suggestions...');
    const suggestions = await claudeService.generateSuggestions(
      'Comment puis-je contacter le support ?',
      'Information de contact disponible'
    );
    
    console.log('✅ Suggestions générées:');
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion}`);
    });
    
    // Test 7: Test de résumé de conversation
    console.log('\n7️⃣ Test de résumé de conversation...');
    const testMessages = [
      { role: 'user', content: 'Bonjour, j\'ai un problème avec ma commande' },
      { role: 'assistant', content: 'Bonjour ! Je peux vous aider. Quel est le problème ?' },
      { role: 'user', content: 'Ma commande n\'est pas arrivée et ça fait 5 jours' },
      { role: 'assistant', content: 'Je comprends votre inquiétude. Pouvez-vous me donner votre numéro de commande ?' },
      { role: 'user', content: 'C\'est le numéro CMD-12345' },
      { role: 'assistant', content: 'Je vais vérifier votre commande immédiatement.' }
    ];
    
    const summary = await claudeService.generateConversationSummary(testMessages);
    console.log('✅ Résumé généré:');
    console.log(`   Résumé: ${summary}`);
    
    // Test 8: Test d'amélioration de contenu
    console.log('\n8️⃣ Test d\'amélioration de contenu...');
    const improved = await claudeService.improveKnowledge(
      'Contact',
      'Vous pouvez nous contacter par email.'
    );
    
    console.log('✅ Contenu amélioré:');
    console.log(`   Titre original: "Contact"`);
    console.log(`   Titre amélioré: "${improved.title}"`);
    console.log(`   Contenu original: "Vous pouvez nous contacter par email."`);
    console.log(`   Contenu amélioré: "${improved.content}"`);
    
    console.log('\n🎉 TOUS LES TESTS CLAUDE SONT RÉUSSIS !');
    console.log('✅ Claude Anthropic est opérationnel');
    console.log('✅ Toutes les fonctionnalités testées');
    console.log('✅ Prêt pour la production');
    
    console.log('\n📊 RÉSUMÉ DES CAPACITÉS:');
    console.log('• Génération de réponses contextuelles');
    console.log('• Analyse de sentiment');
    console.log('• Génération de suggestions');
    console.log('• Résumés automatiques');
    console.log('• Amélioration de contenu');
    console.log('• Historique de conversation');
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST CLAUDE:', error);
    
    if (error.message.includes('API key')) {
      console.log('\n🔑 PROBLÈME DE CLÉ API:');
      console.log('1. Vérifiez que ANTHROPIC_API_KEY est correctement défini');
      console.log('2. Vérifiez que la clé commence par "sk-ant-"');
      console.log('3. Vérifiez que la clé est valide sur console.anthropic.com');
    } else if (error.message.includes('rate limit')) {
      console.log('\n⏱️ LIMITE DE TAUX:');
      console.log('1. Attendez quelques minutes avant de réessayer');
      console.log('2. Vérifiez vos quotas sur console.anthropic.com');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n🌐 PROBLÈME RÉSEAU:');
      console.log('1. Vérifiez votre connexion internet');
      console.log('2. Vérifiez que l\'API Anthropic est accessible');
    }
    
    console.log('\n🔧 INFORMATIONS DE DEBUG:');
    console.log(`Modèle configuré: ${process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'}`);
    console.log(`Max tokens: ${process.env.ANTHROPIC_MAX_TOKENS || 1000}`);
    console.log(`Clé API définie: ${process.env.ANTHROPIC_API_KEY ? 'Oui' : 'Non'}`);
  }
}

// Fonction pour tester les modèles Claude disponibles
async function testClaudeModels() {
  console.log('\n🔬 TEST DES MODÈLES CLAUDE');
  console.log('-'.repeat(30));
  
  const models = [
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229'
  ];
  
  for (const model of models) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      await client.messages.create({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      console.log(`✅ ${model}: Disponible`);
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`);
    }
  }
}

// Exécution
if (require.main === module) {
  console.log(`🔧 Configuration actuelle:`);
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`   ANTHROPIC_MODEL: ${process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'}`);
  console.log(`   ANTHROPIC_MAX_TOKENS: ${process.env.ANTHROPIC_MAX_TOKENS || 1000}`);
  console.log('');
  
  testClaudeIntegration()
    .then(() => testClaudeModels())
    .catch(console.error);
}

module.exports = { testClaudeIntegration };
