// backend/src/services/claudeService.js - Version améliorée avec RAG complet
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/config');
const { KnowledgeBase } = require('../models');
const { Op } = require('sequelize');
const { buildTenantInstructionsBlock } = require('./chatPromptBuilder');

class ClaudeService {
  constructor() {
    if (!config.claude.apiKey || config.claude.apiKey === 'sk-ant-your-key-here') {
      console.warn('⚠️  Claude API key not configured. AI features will be disabled.');
      this.client = null;
      return;
    }

    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
    });

    // Configuration par défaut
    this.defaultModel = config.claude.model || 'claude-3-haiku-20240307';
    this.maxTokens = config.claude.maxTokens || 1500; // Augmenté pour de meilleures réponses
  }

  // Vérifier si Claude est disponible
  isAvailable() {
    return this.client !== null;
  }

  // Recherche sémantique améliorée dans la base de connaissances
  async searchKnowledgeBase(tenantId, query, limit = 5) {
    try {
      console.log(`🔍 Recherche dans la base de connaissances pour: "${query}"`);
      
      // Extraire les mots-clés importants de la requête
      const keywords = this.extractKeywords(query);
      console.log(`🔑 Mots-clés extraits: ${keywords.join(', ')}`);
      
      // 1. Recherche par mots-clés individuels (plus flexible)
      const keywordConditions = keywords.map(keyword => ({
        [Op.or]: [
          { title: { [Op.iLike]: `%${keyword}%` } },
          { content: { [Op.iLike]: `%${keyword}%` } }
        ]
      }));

      let exactMatches = [];
      if (keywordConditions.length > 0) {
        exactMatches = await KnowledgeBase.findAll({
          where: {
            tenantId,
            isActive: true,
            [Op.or]: keywordConditions
          },
          limit: Math.min(limit * 2, 10), // Chercher plus de résultats pour mieux scorer
          order: [['updatedAt', 'DESC']],
          attributes: ['id', 'title', 'content', 'tags', 'sourceType', 'createdAt'],
        });
      }

      // 2. Recherche par tags si pas assez de résultats
      let tagMatches = [];
      if (exactMatches.length < limit) {
        const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
        
        if (queryWords.length > 0) {
          tagMatches = await KnowledgeBase.findAll({
            where: {
              tenantId,
              isActive: true,
              tags: {
                [Op.overlap]: queryWords
              },
              id: {
                [Op.notIn]: exactMatches.map(item => item.id)
              }
            },
            limit: limit - Math.min(exactMatches.length, limit),
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'title', 'content', 'tags', 'sourceType', 'createdAt'],
          });
        }
      }

      // 3. Recherche de fallback si toujours pas de résultats
      let fallbackMatches = [];
      if (exactMatches.length === 0 && tagMatches.length === 0) {
        // Recherche avec des mots plus courts ou des variantes
        const shortKeywords = query.toLowerCase().split(' ').filter(word => word.length > 1);
        if (shortKeywords.length > 0) {
          const fallbackConditions = shortKeywords.map(keyword => ({
            [Op.or]: [
              { title: { [Op.iLike]: `%${keyword}%` } },
              { content: { [Op.iLike]: `%${keyword}%` } }
            ]
          }));

          fallbackMatches = await KnowledgeBase.findAll({
            where: {
              tenantId,
              isActive: true,
              [Op.or]: fallbackConditions
            },
            limit: limit,
            order: [['updatedAt', 'DESC']],
            attributes: ['id', 'title', 'content', 'tags', 'sourceType', 'createdAt'],
          });
        }
      }

      // 4. Combiner et scorer les résultats
      const allMatches = [...exactMatches, ...tagMatches, ...fallbackMatches];
      const uniqueMatches = allMatches.filter((item, index, arr) => 
        arr.findIndex(i => i.id === item.id) === index
      );

      const scoredResults = uniqueMatches.map(item => ({
        item,
        similarity: this.calculateRelevanceScore(query, keywords, item)
      })).sort((a, b) => b.similarity - a.similarity);

      console.log(`📊 Trouvé ${scoredResults.length} résultats pertinents`);
      return scoredResults.slice(0, limit);

    } catch (error) {
      console.error('❌ Erreur dans searchKnowledgeBase:', error);
      return [];
    }
  }

  // Extraire les mots-clés importants d'une requête
  extractKeywords(query) {
    // Mots vides à ignorer en français
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'da', 'à', 'au', 'aux', 'avec', 'sans',
      'pour', 'par', 'dans', 'sur', 'sous', 'vers', 'chez', 'entre', 'contre', 'pendant',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or', 'si', 'que', 'qui', 'quoi', 'dont', 'où',
      'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
      'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'je', 'tu', 'il', 'elle', 'nous', 'vous',
      'ils', 'elles', 'me', 'te', 'se', 'lui', 'y', 'en', 'moi', 'toi', 'soi', 'est', 'sont',
      'était', 'étaient', 'sera', 'seront', 'avoir', 'être', 'fait', 'faire', 'dit', 'dire',
      'bonjour', 'salut', 'merci', 'svp', 's\'il', 'vous', 'plaît', 'pouvez', 'voulez', 'peux',
      'j\'aimerais', 'j\'aimerai', 'aimerais', 'aimerai', 'savoir', 'connaître', 'combien', 'coute',
      'coûte', 'prix', 'tarif', 'comment', 'pourquoi', 'quand', 'quel', 'quelle', 'quels', 'quelles'
    ]);

    const words = query.toLowerCase()
      .replace(/[^\w\sàáâãäèéêëìíîïòóôõöùúûüýÿñç]/g, ' ') // Garder les accents
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word));

    // Garder les mots importants et les expressions composées
    const keywords = [];
    const importantWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Garder les mots de 3+ caractères ou les mots importants courts
      if (word.length >= 3 || ['pc', 'tv', 'hp', 'lg', 'cd', 'dvd'].includes(word)) {
        importantWords.push(word);
      }

      // Détecter les expressions composées (ex: "ordinat bakan")
      if (i < words.length - 1) {
        const compound = `${word} ${words[i + 1]}`;
        if (compound.length > 6) {
          keywords.push(compound);
        }
      }
    }

    // Ajouter les mots individuels
    keywords.push(...importantWords);

    // Supprimer les doublons et garder les plus spécifiques
    return [...new Set(keywords)].sort((a, b) => b.length - a.length).slice(0, 8);
  }

  // Calcul de score de pertinence amélioré
  calculateRelevanceScore(query, keywords, item) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();
    
    // Score pour correspondance exacte dans le titre (poids très élevé)
    if (titleLower.includes(queryLower)) {
      score += 20;
    }

    // Score pour correspondance exacte dans le contenu
    if (contentLower.includes(queryLower)) {
      score += 15;
    }
    
    // Score pour mots-clés dans le titre (poids élevé)
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        score += keyword.length > 6 ? 10 : 7; // Bonus pour les mots composés
      }
      if (contentLower.includes(keyword)) {
        score += keyword.length > 6 ? 5 : 3;
      }
    });

    // Score pour mots individuels
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 4;
      if (contentLower.includes(word)) score += 2;
    });
    
    // Score pour tags correspondants
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (queryLower.includes(tagLower)) score += 6;
        keywords.forEach(keyword => {
          if (keyword.includes(tagLower) || tagLower.includes(keyword)) score += 4;
        });
      });
    }
    
    // Bonus spéciaux pour des mots-clés liés aux prix
    const priceKeywords = ['prix', 'tarif', 'coût', 'coute', 'coûte', 'combien', 'f', 'franc', 'euro', '€'];
    const hasPriceContext = priceKeywords.some(pk => queryLower.includes(pk));
    const hasPriceContent = priceKeywords.some(pk => contentLower.includes(pk)) || 
                           /\d+\s*[f€]/.test(contentLower) || // Détecte "1000f" ou "100€"
                           /prix\s*:\s*\d+/.test(contentLower); // Détecte "prix : 1000"
    
    if (hasPriceContext && hasPriceContent) {
      score += 8;
    }
    
    // Bonus pour les sources fiables
    if (item.sourceType === 'manual') score += 2;
    if (item.sourceType === 'upload') score += 1;
    if (item.sourceType === 'url') score += 0.5;
    
    // Bonus pour les documents récents
    const daysSinceCreation = (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) score += 1;
    
    return score;
  }

  // Génération de réponse avec RAG amélioré
  async generateChatResponse(tenantId, userMessage, conversationHistory = [], tenantSettings = {}, tenantFeatures = {}) {
    if (!this.isAvailable()) {
      return {
        response: "Désolé, le service IA n'est pas disponible actuellement. Veuillez réessayer plus tard.",
        sources: [],
        model: 'fallback',
        tokensUsed: 0,
      };
    }

    try {
      console.log(`🤖 Génération de réponse pour: "${userMessage}"`);
      
      // 1. Rechercher dans la base de connaissances
      const relevantKnowledge = await this.searchKnowledgeBase(tenantId, userMessage, 4);
      
      // 2. Construire le contexte enrichi
      const context = this.buildEnhancedContext(relevantKnowledge, tenantSettings);
      
      // 3. Construire le prompt pour Claude avec instructions avancées
      const prompt = this.buildAdvancedClaudePrompt(
        userMessage, 
        conversationHistory, 
        context, 
        tenantSettings,
        relevantKnowledge.length > 0,
        tenantFeatures
      );

      // 4. Appeler Claude avec une configuration optimisée
      console.log(`📤 Envoi à Claude (${this.defaultModel})`);
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: this.maxTokens,
        temperature: 0.7, // Équilibre entre créativité et cohérence
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = response.content[0].text;
      console.log(`✅ Réponse Claude générée (${responseText.length} caractères)`);
      
      // 5. Préparer les sources utilisées avec métadonnées
      const sources = relevantKnowledge
        .filter(item => item.similarity > 2) // Seuil de pertinence ajusté
        .map(item => ({
          id: item.item.id,
          title: item.item.title,
          similarity: Math.round(item.similarity * 10) / 10,
          sourceType: item.item.sourceType,
          snippet: this.extractRelevantSnippet(item.item.content, userMessage)
        }));

      // 6. Générer des suggestions de suivi
      const suggestions = await this.generateContextualSuggestions(
        userMessage, 
        responseText, 
        relevantKnowledge
      );

      return {
        response: responseText,
        sources,
        suggestions,
        model: this.defaultModel,
        tokensUsed: response.usage ? response.usage.input_tokens + response.usage.output_tokens : null,
        hasKnowledgeContext: relevantKnowledge.length > 0,
        confidence: this.calculateResponseConfidence(relevantKnowledge, responseText)
      };

    } catch (error) {
      console.error('❌ Erreur Claude détaillée:', {
        message: error.message,
        status: error.status,
        type: error.type,
        tenantId
      });
      
      // Réponse de fallback intelligente
      const fallbackResponse = this.generateFallbackResponse(userMessage, error);
      
      return {
        response: fallbackResponse,
        sources: [],
        suggestions: [],
        model: 'fallback',
        error: error.message,
        tokensUsed: 0,
        hasKnowledgeContext: false,
        confidence: 0.1
      };
    }
  }

  // Construire le contexte enrichi
  buildEnhancedContext(relevantKnowledge, tenantSettings) {
    if (relevantKnowledge.length === 0) {
      return '';
    }

    const companyName = tenantSettings.name || 'notre entreprise';
    let context = `\n\n📚 BASE DE CONNAISSANCES DE ${companyName.toUpperCase()}:\n`;
    
    relevantKnowledge.forEach((item, index) => {
      const source = item.item;
      context += `\n[SOURCE ${index + 1}] ${source.title}`;
      if (source.sourceType === 'url') context += ` (Web)`;
      if (source.sourceType === 'upload') context += ` (Document)`;
      context += `\n${source.content.slice(0, 800)}\n`;
      
      if (source.tags && source.tags.length > 0) {
        context += `Tags: ${source.tags.join(', ')}\n`;
      }
      context += `---\n`;
    });

    return context;
  }

  // Prompt avancé pour Claude avec instructions spécialisées
  buildAdvancedClaudePrompt(userMessage, conversationHistory, context, tenantSettings, hasContext, tenantFeatures = {}) {
    const chatbotName = tenantSettings.chatbot?.name || 'Assistant';
    const companyName = tenantSettings.name || 'notre entreprise';
    const tone = tenantSettings.chatbot?.tone || 'professionnel mais accessible';

    // Instructions système avancées
    let systemPrompt = `Tu es ${chatbotName}, l'assistant virtuel intelligent de ${companyName}.

🎯 MISSION PRINCIPALE:
- Aider les utilisateurs avec leurs questions sur ${companyName}
- Fournir des réponses précises, utiles et engageantes
- Maintenir un ton ${tone}
- Toujours répondre en français de manière claire

📋 INSTRUCTIONS DE RÉPONSE:
${hasContext ? 
`✅ AVEC CONTEXTE - Utilise PRIORITAIREMENT les informations de la base de connaissances:
- Réponds en te basant sur les SOURCES fournies ci-dessous
- Mentionne naturellement d'où viennent les informations ("Selon notre documentation...", "D'après nos guides...")
- Si les sources ne couvrent pas entièrement la question, combine avec tes connaissances générales
- Indique clairement quand tu utilises des informations générales vs spécifiques à l'entreprise` 
:
`⚠️ SANS CONTEXTE SPÉCIFIQUE - Pas d'information directe trouvée:
- Réponds avec tes connaissances générales mais reste dans le contexte de ${companyName}
- Propose des alternatives ou suggest de contacter le support pour des questions très spécifiques
- Reste utile et engageant même sans contexte spécifique`}

🔧 RÈGLES TECHNIQUES:
- Maximum 200 mots (sauf si plus nécessaire pour être complet)
- Structure claire avec des paragraphes courts
- Utilise des emojis avec parcimonie (1-2 max)
- Évite les répétitions inutiles
- Ne mentionne jamais Claude ou Anthropic

💡 STYLE DE RÉPONSE:
- Empathique et professionnel
- Orienté solution
- Personnalisé pour ${companyName}
- Encourage l'engagement utilisateur`;

    if (tenantFeatures.customAiInstructions === true) {
      systemPrompt += buildTenantInstructionsBlock(tenantSettings.chatbot?.customInstructions);
    }

    // Ajouter l'historique de conversation s'il existe
    if (conversationHistory.length > 0) {
      systemPrompt += `\n\n💬 HISTORIQUE CONVERSATION RÉCENTE:\n`;
      conversationHistory.slice(-4).forEach(msg => {
        const role = msg.role === 'user' ? 'Utilisateur' : chatbotName;
        systemPrompt += `${role}: ${msg.content.slice(0, 150)}\n`;
      });
    }

    // Ajouter le contexte de la base de connaissances
    if (context) {
      systemPrompt += context;
    }

    // Question actuelle
    systemPrompt += `\n\n🔷 QUESTION ACTUELLE DE L'UTILISATEUR:\n"${userMessage}"`;

    // Instructions finales
    systemPrompt += `\n\n✨ GÉNÈRE UNE RÉPONSE PARFAITE:`;
    if (hasContext) {
      systemPrompt += `\nUtilise intelligemment les sources ci-dessus pour donner une réponse précise et complète.`;
    } else {
      systemPrompt += `\nBien qu'aucune source spécifique ne soit trouvée, aide du mieux que tu peux en restant dans le contexte de ${companyName}.`;
    }

    return systemPrompt;
  }

  // Extraire un snippet pertinent du contenu
  extractRelevantSnippet(content, query, maxLength = 150) {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const sentences = content.split(/[.!?]+/);
    
    // Trouver la phrase la plus pertinente
    let bestSentence = sentences[0];
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      if (sentence.length < 20) return;
      
      let score = 0;
      const sentenceLower = sentence.toLowerCase();
      
      queryWords.forEach(word => {
        if (sentenceLower.includes(word)) score += 1;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    });
    
    const snippet = bestSentence.trim();
    return snippet.length > maxLength ? snippet.slice(0, maxLength) + '...' : snippet;
  }

  // Générer des suggestions contextuelles
  async generateContextualSuggestions(userMessage, response, knowledgeItems) {
    const suggestions = [];
    
    // Suggestions basées sur les tags des sources utilisées
    const allTags = knowledgeItems
      .flatMap(item => item.item.tags || [])
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 5);
    
    // Suggestions prédéfinies selon le contexte
    if (userMessage.toLowerCase().includes('prix') || userMessage.toLowerCase().includes('tarif')) {
      suggestions.push('Quels sont vos différents plans tarifaires ?');
      suggestions.push('Y a-t-il des réductions disponibles ?');
    } else if (userMessage.toLowerCase().includes('comment')) {
      suggestions.push('Avez-vous un guide détaillé ?');
      suggestions.push('Puis-je voir un exemple concret ?');
    } else if (userMessage.toLowerCase().includes('problème') || userMessage.toLowerCase().includes('erreur')) {
      suggestions.push('Comment puis-je contacter le support ?');
      suggestions.push('Y a-t-il d\'autres solutions ?');
    } else {
      // Suggestions génériques basées sur les tags
      allTags.forEach(tag => {
        if (tag !== 'général') {
          suggestions.push(`En savoir plus sur ${tag}`);
        }
      });
    }
    
    // Limiter à 3 suggestions max
    return suggestions.slice(0, 3);
  }

  // Calculer la confiance de la réponse
  calculateResponseConfidence(knowledgeItems, response) {
    let confidence = 0.5; // Confidence de base
    
    // Bonus si on a des sources
    if (knowledgeItems.length > 0) {
      confidence += 0.3;
      
      // Bonus selon la qualité des sources
      const avgSimilarity = knowledgeItems.reduce((sum, item) => sum + item.similarity, 0) / knowledgeItems.length;
      confidence += Math.min(avgSimilarity / 10, 0.2);
    }
    
    // Bonus si la réponse est de bonne longueur (ni trop courte ni trop longue)
    if (response.length > 50 && response.length < 500) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Générer une réponse de fallback intelligente
  generateFallbackResponse(userMessage, error) {
    const responses = [
      "Je rencontre actuellement des difficultés techniques. Pouvez-vous reformuler votre question ou réessayer dans quelques instants ?",
      "Il semble y avoir un problème temporaire avec mes services. Votre question est importante, pourriez-vous la reposer ?",
      "Je ne peux pas accéder à toutes mes ressources en ce moment. Puis-je vous aider autrement ou souhaitez-vous réessayer ?"
    ];
    
    // Réponse contextuelle selon le type d'erreur
    if (error.message.includes('timeout')) {
      return "Je prends un peu plus de temps que d'habitude pour répondre. Pouvez-vous reformuler votre question ?";
    }
    
    if (error.message.includes('rate limit')) {
      return "Je reçois beaucoup de questions en ce moment. Veuillez patienter quelques instants avant de réessayer.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Analyser le sentiment d'un message (méthode existante améliorée)
  async analyzeSentiment(text) {
    if (!this.isAvailable()) {
      return { sentiment: 'neutral', confidence: 0 };
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Analyse le sentiment de ce message en français et réponds uniquement par un JSON:
          {"sentiment": "positive/negative/neutral", "confidence": 0.8, "emotion": "joie/colère/frustration/satisfaction/neutre"}
          
          Message: "${text}"`
        }]
      });

      const result = response.content[0].text.trim();
      try {
        const parsed = JSON.parse(result);
        return {
          sentiment: parsed.sentiment || 'neutral',
          confidence: parsed.confidence || 0.5,
          emotion: parsed.emotion || 'neutre'
        };
      } catch {
        // Fallback si le JSON n'est pas valide
        const sentiment = result.toLowerCase().includes('positive') ? 'positive' : 
                         result.toLowerCase().includes('negative') ? 'negative' : 'neutral';
        return { sentiment, confidence: 0.6, emotion: 'neutre' };
      }
    } catch (error) {
      console.error('Erreur analyse sentiment:', error);
      return { sentiment: 'neutral', confidence: 0, emotion: 'neutre' };
    }
  }

  // Générer un résumé de conversation (méthode existante)
  async generateConversationSummary(messages) {
    if (!this.isAvailable() || messages.length === 0) {
      return 'Résumé non disponible';
    }

    try {
      const conversationText = messages.slice(-6).map(msg => 
        `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Résume cette conversation en français en 2-3 phrases maximum, en mettant l'accent sur le problème principal et la solution proposée:

${conversationText}`
        }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error('Erreur génération résumé:', error);
      return 'Conversation sur l\'assistance client';
    }
  }

  // Test de connexion Claude (méthode existante)
  async testConnection() {
    if (!this.isAvailable()) {
      throw new Error('Claude client not initialized');
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Réponds simplement "Test de connexion réussi avec Claude" en français.'
        }]
      });

      return {
        success: true,
        response: response.content[0].text,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      throw new Error(`Claude connection failed: ${error.message}`);
    }
  }
}

// Singleton instance
const claudeService = new ClaudeService();

module.exports = claudeService;
