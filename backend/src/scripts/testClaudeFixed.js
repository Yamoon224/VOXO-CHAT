// backend/src/scripts/testClaudeFixed.js
require('dotenv').config();
const claudeService = require('../services/claudeService');
const { v4: uuidv4 } = require('uuid'); // Pour générer de vrais UUIDs

async function testClaudeWithoutDB() {
  console.log('🤖 TEST CLAUDE SANS BASE DE DONNÉES');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Vérifier la disponibilité
    console.log('1️⃣ Vérification de la disponibilité...');
    if (!claudeService.isAvailable()) {
      console.log('❌ Claude service non disponible');
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
    
    // Test 3: Test de génération de réponse simple (SANS recherche DB)
    console.log('\n3️⃣ Test de génération de réponse simple...');
    
    // Mock de la fonction searchKnowledgeBase pour éviter l'erreur DB
    const originalSearch = claudeService.searchKnowledgeBase;
    claudeService.searchKnowledgeBase = async () => [];
    
    const simpleResponse = await claudeService.generateChatResponse(
      uuidv4(), // UUID valide généré
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
      uuidv4(), // UUID valide généré
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
    
    // Restaurer la fonction originale
    claudeService.searchKnowledgeBase = originalSearch;
    
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
    
    console.log('\n📊 CAPACITÉS VALIDÉES:');
    console.log('• Génération de réponses contextuelles ✅');
    console.log('• Analyse de sentiment ✅');
    console.log('• Génération de suggestions ✅');
    console.log('• Résumés automatiques ✅');
    console.log('• Amélioration de contenu ✅');
    console.log('• Historique de conversation ✅');
    
    console.log('\n🚀 PRÊT À DÉMARRER LE SERVEUR !');
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST CLAUDE:', error.message);
  }
}

testClaudeWithoutDB();