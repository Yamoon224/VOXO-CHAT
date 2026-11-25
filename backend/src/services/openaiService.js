// src/services/openaiService.js
const OpenAI = require('openai');
const config = require('../config/config');
const { KnowledgeBase } = require('../models');
const ragService = require('./ragService');
const chatPromptBuilder = require('./chatPromptBuilder');
const visionService = require('./visionService');
const { detectSocialIntent } = require('../utils/messageIntentUtils');
const { AppError } = require('../middleware/errorMiddleware');
const mediaResponsePolicyService = require('./mediaResponsePolicyService');
const productImageSearchService = require('./productImageSearchService');
const agentToolLoopService = require('./agentToolLoopService');
const agentTurnBudgetService = require('./agentTurnBudgetService');
const agentUsageService = require('./agentUsageService');

class OpenAIService {
  constructor() {
    this.defaultModel = config.openai.model || 'openai/gpt-4o-mini';
    this.visionModel = config.openai.visionModel || 'openai/gpt-4o-mini';
    this.embeddingModel = 'text-embedding-3-small';
    this.maxTokens = 1000;
    this.temperature = 0.7;

    if (!config.openai.apiKey || config.openai.apiKey === 'sk-your-openai-api-key-here') {
      console.warn('⚠️  OpenAI API key not configured. AI features will be disabled.');
      this.client = null;
      this.embeddingClient = null;
      return;
    }

    // Client principal via OpenRouter (pour les chats)
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        "HTTP-Referer": config.app.frontendUrl || "http://localhost:3001",
        "X-Title": "Voxo Chat",
      }
    });


    console.log("🎨 Voxo Chat - Service OpenAI/OpenRouter Initialisé");
    console.log("🔑 Clé API OpenRouter:", config.openai.apiKey ? "✅ Présente" : "❌ ABSENTE");
    console.log("🌐 URL OpenRouter:", config.openai.baseURL || "❌ non configurée");
    console.log("🎯 Modèle par défaut:", config.openai.model || "❌ non configuré");

    // Client séparé pour les embeddings via OpenAI direct.
    // OpenRouter ne supporte pas l'API embeddings d'OpenAI
    const realOpenAIKey = config.openai.directApiKey || null;
    if (realOpenAIKey) {
      this.embeddingClient = new OpenAI({ apiKey: realOpenAIKey });
      console.log('✅ Embedding client (OpenAI direct) initialisé.');
    } else {
      this.embeddingClient = null;
      console.warn('⚠️ Pas de clé OpenAI directe (OPENAI_DIRECT_KEY). Embeddings désactivés → fallback recherche par mots-clés.');
    }

    // Configuration par défaut
    // ⚠️  openai/gpt-5.4-nano n'existe pas sur OpenRouter → utiliser openai/gpt-4o-mini
  }

  // Vérifier si OpenAI est disponible
  isAvailable() {
    return this.client !== null;
  }

  // Générer des embeddings pour la recherche sémantique
  // Retourne null si le client embedding n'est pas disponible (pas de throw)
  async generateEmbedding(text) {
    if (!this.embeddingClient) {
      return null; // Pas de clé OpenAI directe, on skip silencieusement
    }

    try {
      const response = await this.embeddingClient.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null; // Retourne null au lieu de throw
    }
  }

  // Recherche sémantique dans la base de connaissances
  // Utilise les embeddings si disponibles, sinon fallback sur recherche par mots-clés
  async searchKnowledgeBase(tenantId, query, limit = 5) {
    return ragService.search(tenantId, query, limit);
  }

  // Calculer la similarité cosinus entre deux vecteurs
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Génération de réponse avec RAG (Retrieval-Augmented Generation).
  // Le widget fournit `attachmentContext`; les canaux entrants fournissent
  // `supplementalContext` et des métadonnées sûres dans `attachment`.
  async generateChatResponse(
    tenantId,
    userMessage,
    conversationHistory = [],
    tenantSettings = {},
    tenantName = '',
    options = {}
  ) {
    if (!this.isAvailable()) {
      if (options.images?.length) {
        throw new AppError("L'analyse d'image n'est pas disponible pour le moment.", 503, {
          code: 'VISION_UNAVAILABLE',
        });
      }
      return {
        response: "Désolé, le service IA n'est pas disponible actuellement. Veuillez réessayer plus tard.",
        sources: [],
        model: 'fallback',
      };
    }

    try {
      // 1. Un message purement social ne déclenche aucune recherche : cela évite
      //    d'attacher des sources non pertinentes à un simple « bonjour ».
      if (options.images?.length) {
        const model = this.selectModel(options.images);
        const productResult = await productImageSearchService.generateChatResponse({
          client: this.client, model, tenantId, images: options.images,
        });
        if (productResult) return productResult;
      }
      const intent = detectSocialIntent(userMessage);
      const retrievalQuery = this.buildRetrievalQuery(userMessage, options);

      const relevantKnowledge = intent.isPureSocial
        ? []
        : await this.searchKnowledgeBase(tenantId, retrievalQuery, ragService.defaultTopK);

      // 2. Construire un contexte commun aux connaissances et aux pièces jointes.
      const knowledgeContext = chatPromptBuilder.buildContext(relevantKnowledge);
      const mediaContext = this.buildMediaContext(options);
      const selectedModel = this.selectModel(options.images);
      const visionResult = await this.prepareVision(userMessage, options.images, selectedModel);

      // 3. Construire les messages pour OpenAI. Les sujets servent aussi de rebond
      //    après un message social, on les charge donc dans ce cas également.
      const availableTopics = (knowledgeContext && !intent.isPureSocial)
        ? []
        : await chatPromptBuilder.getAvailableTopics(tenantId);

      const { tools, actionsByName } = await agentToolLoopService.loadTools(tenantId, tenantSettings);

      const messages = chatPromptBuilder.buildMessages({
        userMessage,
        conversationHistory,
        context: knowledgeContext,
        mediaContext,
        imageAnalysis: { ...visionResult, ocrAvailable: Boolean(mediaContext) },
        tenantSettings,
        tenantName,
        availableTopics,
        socialOnly: intent.isPureSocial,
        mediaType: options.attachment?.type || null,
        toolsAvailable: Boolean(tools),
        tenantFeatures: options.tenantFeatures || {},
        locale: options.locale,
      });

      // 3 bis. Vision : on remplace le contenu du dernier message utilisateur
      // par un contenu multimodal. Si le modèle ne la supporte pas, on ne
      // touche à rien : l'OCR des images est déjà passé par attachmentContext.
      this.applyPreparedVision(messages, visionResult);

      // 4. Appeler OpenRouter — avec les actions agent actives du tenant, si activées.
      const callCompletion = (msgs, callTools, callOptions = {}) => this.client.chat.completions.create({
        model: selectedModel,
        messages: msgs,
        max_tokens: callOptions.maxOutputTokens || this.maxTokens,
        temperature: this.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        ...(callTools ? { tools: callTools, tool_choice: 'auto' } : {}),
      });

      let response;
      let tokensUsed;
      let agentBudget;
      let agentResult;
      let correctionSkipped = false;
      if (tools) {
        agentBudget = agentTurnBudgetService.create();
        const result = await agentToolLoopService.runWithTools({
          messages, tools, actionsByName, callCompletion, tenantId, budget: agentBudget, maxOutputTokens: this.maxTokens,
        });
        response = result.content;
        tokensUsed = result.tokensUsed;
        agentResult = result;
      } else {
        const completion = await callCompletion(messages);
        response = completion.choices[0].message.content;
        tokensUsed = completion.usage.total_tokens;
      }

      const correction = mediaResponsePolicyService.correctionFor({
        response,
        visionUsed: visionResult.visionUsed,
        mediaType: options.attachment?.type || null,
      });
      if (correction && !agentBudget) {
        messages.push(
          { role: 'assistant', content: response },
          { role: 'user', content: correction }
        );
        const correctionCompletion = await this.client.chat.completions.create({
          model: selectedModel,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.2,
        });
        response = correctionCompletion.choices[0].message.content;
        tokensUsed += correctionCompletion.usage.total_tokens;
      } else if (correction) {
        messages.push(
          { role: 'assistant', content: response },
          { role: 'user', content: correction }
        );
        const prepared = agentBudget.prepareCall({
          messages,
          desiredOutputTokens: config.agentAction.reservedCorrectionTokens,
        });
        if (!prepared) {
          correctionSkipped = true;
          console.info('agent_turn_budget', { ...agentBudget.summary(), stopReason: 'correction_skipped_budget' });
        } else {
          const correctionCompletion = await this.client.chat.completions.create({
            model: selectedModel,
            messages,
            max_tokens: prepared.maxOutputTokens,
            temperature: 0.2,
          });
          agentBudget.recordCompletion(correctionCompletion, prepared);
          response = correctionCompletion.choices[0].message.content;
          tokensUsed = agentBudget.summary().tokensUsed;
        }
      }
      if (agentResult) {
        const summary = agentBudget.summary();
        agentUsageService.record(tenantId, {
          ...summary,
          toolCalls: agentResult.toolCalls,
          stopReason: agentResult.stopReason,
          correctionSkipped,
        }).catch(error => console.warn('Enregistrement usage agentique échoué:', error.message));
      }
      // 5. Préparer les sources utilisées
      const sources = relevantKnowledge
        .filter(item => item.similarity >= ragService.minSimilarity)
        .map(item => ({
          id: item.item.knowledgeId || item.item.id,
          knowledgeId: item.item.knowledgeId || item.item.id,
          chunkId: item.item.chunkId || null,
          title: item.item.title,
          similarity: item.similarity,
          sourceType: item.item.sourceType,
          snippet: item.item.content ? item.item.content.substring(0, 180) : '',
        }));

      return {
        response,
        sources,
        model: selectedModel,
        tokensUsed,
        usedVision: visionResult.visionUsed,
        imageAnalysis: {
          hasReadableImage: visionResult.hasReadableImage,
          visionUsed: visionResult.visionUsed,
          ocrAvailable: Boolean(mediaContext),
        },
      };

    } catch (error) {
      console.error('🔍 ERREUR OPENROUTER DÉTAILLÉE:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      });

      if (error.isOperational) throw error;
      if (options.images?.length) {
        throw new AppError(
          "L'analyse de l'image est temporairement indisponible. Veuillez réessayer.",
          503,
          { code: 'VISION_SERVICE_UNAVAILABLE' }
        );
      }

      // Réponse de fallback en cas d'erreur
      return {
        response: `Désolé, une erreur est survenue lors de la communication avec l'IA. (${error.message})`,
        sources: [],
        model: 'fallback',
        error: error.message,
      };
    }
  }

  buildRetrievalQuery(userMessage, options = {}) {
    const extracted = options.attachmentContext || options.supplementalContext || '';
    return [userMessage, extracted].filter(Boolean).join('\n').slice(0, 2000);
  }

  buildMediaContext(options = {}) {
    const blocks = [];
    const widgetContext = String(options.attachmentContext || '').trim();
    if (widgetContext) blocks.push(widgetContext);
    const supplemental = String(options.supplementalContext || '').trim();
    if (supplemental) {
      const title = options.attachment?.title || 'Média reçu';
      blocks.push(`--- ${title} ---\n${supplemental}`);
    }
    if (blocks.length === 0) return '';
    const header = options.attachment?.type === 'voice'
      ? 'Transcription automatique du message vocal du visiteur (elle peut comporter des erreurs) :'
      : "Extraction automatique de la pièce jointe (elle peut contenir des erreurs d'OCR) :";
    // Délimiteurs explicites : ce bloc est une donnée fournie par un tiers, jamais une
    // instruction. Sans eux, un texte OCR imitant le prompt serait lu comme une consigne système.
    return [
      header,
      'DÉBUT DU CONTENU VISITEUR',
      ...blocks,
      'FIN DU CONTENU VISITEUR',
    ].join('\n');
  }

  selectModel(images = []) {
    if (!images?.length) return this.defaultModel;
    if (visionService.supportsVision(this.defaultModel)) return this.defaultModel;
    if (visionService.supportsVision(this.visionModel)) return this.visionModel;
    throw new AppError("L'analyse d'image n'est pas configurée pour le moment.", 503, {
      code: 'VISION_UNAVAILABLE',
    });
  }

  async prepareVision(userMessage, images = [], model = this.defaultModel) {
    if (!images?.length) {
      return {
        content: null,
        hasReadableImage: false,
        visionUsed: false,
        unreadableCount: 0,
      };
    }
    if (!visionService.supportsVision(model)) {
      throw new AppError("L'analyse d'image n'est pas configurée.", 503, {
        code: 'VISION_UNAVAILABLE',
      });
    }
    return visionService.buildUserContent(userMessage, images);
  }

  applyPreparedVision(messages, visionResult) {
    if (!visionResult.visionUsed) return;
    const lastUserIndex = messages.map(message => message.role).lastIndexOf('user');
    if (lastUserIndex >= 0) {
      messages[lastUserIndex] = { role: 'user', content: visionResult.content };
    }
  }

  combineContext(knowledgeContext, options = {}) {
    const blocks = [String(knowledgeContext || '').trim()];
    const widgetContext = String(options.attachmentContext || '').trim();
    if (widgetContext) blocks.push(widgetContext);

    const supplementalContext = String(options.supplementalContext || '').trim();
    if (supplementalContext) {
      const title = options.attachment?.title || 'Média reçu';
      blocks.push([
        `CONTEXTE DU MÉDIA « ${title} » :`,
        supplementalContext,
        'FIN DU CONTEXTE DU MÉDIA',
      ].join('\n'));
    }

    return blocks.filter(Boolean).join('\n\n');
  }

  /**
   * Bascule le dernier message utilisateur en contenu multimodal.
   * Modifie `messages` sur place et retourne true si des images ont été jointes.
   */
  async applyVision(messages, userMessage, images = []) {
    const model = this.selectModel(images);
    const result = await this.prepareVision(userMessage, images, model);

    const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1 && result.visionUsed) {
      messages[lastUserIndex] = { role: 'user', content: result.content };
    }
    return result;
  }

  // Générer des suggestions de suivi
  async generateSuggestions({ response: assistantResponse, sources = [] } = {}) {
    if (!this.isAvailable()) return [];
    if (!assistantResponse || !Array.isArray(sources) || sources.length === 0) return [];

    const sourceContext = sources
      .map(source => [source.title, source.snippet].filter(Boolean).join(': '))
      .filter(Boolean)
      .join('\n');
    if (!sourceContext) return [];

    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'system',
          content: `
          Génère au plus 3 questions de suivi courtes que le visiteur pourrait poser.
          Elles doivent être directement répondables à partir des sources fournies, sans inventer de fait.
          Formule-les à la première personne (ex: 'Quels sont vos tarifs ?'). Ne pose pas de question au visiteur.
          Réponds uniquement avec les questions, une par ligne, sans numérotation ni commentaire.
          `
        }, {
          role: 'user',
          content: `Réponse de l'assistant:\n${assistantResponse}\n\nSources utilisées:\n${sourceContext}`
        }],
        max_tokens: 100,
        temperature: 0.7,
      });

      const seen = new Set();
      return response.choices[0].message.content
        .split('\n')
        .map(question => question.trim()
          .replace(/^[-*•\d]+[.)\s-]+/, '')
          .replace(/\s+/g, ' '))
        .filter(question => question.length > 0 && question.length <= 220)
        .filter(question => {
          const key = question.toLocaleLowerCase('fr-FR');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 3);
    } catch (error) {
      console.error('Error generating suggestions:', error.message);
      return [];
    }
  }

  // Générer les suggestions d'accueil (dès le départ)
  async generateInitialSuggestions(tenantId) {
    if (!this.isAvailable()) return [];

    try {
      // Récupérer un résumé de la base de connaissances (les titres)
      const knowledgeItems = await KnowledgeBase.findAll({
        where: { tenantId, isActive: true },
        attributes: ['title', 'content'],
        limit: 10 // On prend les 10 premiers pour ne pas exploser le contexte
      });

      const context = knowledgeItems.map(k => `- ${k.title}`).join('\n');

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'system',
          content: "Tu dois générer 3 questions courtes et accrocheuses que l'utilisateur pourrait te poser au tout début de la conversation pour découvrir l'entreprise. Formule-les à la 1ère personne (ex: 'Que proposez-vous ?'). Base-toi sur les titres de la documentation de l'entreprise. Réponds uniquement avec les 3 questions, une par ligne, sans numérotation."
        }, {
          role: 'user',
          content: `Documentation de l'entreprise:\n${context}`
        }],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0].message.content
        .split('\n')
        .filter(q => q.trim().length > 0)
        .slice(0, 3);
    } catch (error) {
      console.error('Error generating initial suggestions:', error.message);
      return [];
    }
  }

  // Valider si les suggestions du propriétaire sont pertinentes
  async validateOwnerSuggestions(suggestions, tenantId) {
    if (!this.isAvailable()) return { isValid: true };

    try {
      // Récupérer un extrait du contexte
      const knowledgeItems = await KnowledgeBase.findAll({
        where: { tenantId, isActive: true },
        attributes: ['title', 'content']
      });
      const context = knowledgeItems.map(k => `Titre: ${k.title}\nContenu: ${k.content ? k.content.substring(0, 200) : ''}...`).join('\n\n');

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'system',
          content: "Tu es un évaluateur strict. On te donne un résumé rapide d'une entreprise et une liste de questions suggérées. Si le contexte permet d'apporter au moins une réponse partielle à TOUTES ces questions, réponds EXACTEMENT 'VALIDE'. Si certaines questions sont impossibles à répondre avec le contexte donné (ex: demander un tarif alors qu'aucun tarif n'est mentionné), réponds 'REFUSÉ' suivi d'une courte explication du problème."
        }, {
          role: 'user',
          content: `Questions suggérées:\n${suggestions.join('\n')}\n\nContexte de l'entreprise:\n${context}`
        }],
        max_tokens: 200,
        temperature: 0,
      });

      const reply = response.choices[0].message.content.trim();
      const isValid = reply.startsWith('VALIDE');

      return {
        isValid,
        reason: isValid ? null : reply.replace('REFUSÉ', '').replace(/^:/, '').trim()
      };
    } catch (error) {
      console.error('Error validating owner suggestions:', error.message);
      return { isValid: true }; // Fallback sécuritaire
    }
  }

  // Générer un résumé de conversation
  async generateConversationSummary(messages) {
    if (!this.isAvailable() || messages.length === 0) return 'Résumé non disponible';

    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'system',
          content: 'Résume cette conversation en une phrase courte en français.'
        }, {
          role: 'user',
          content: conversationText
        }],
        max_tokens: 100,
        temperature: 0.5,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error.message);
      return 'Conversation en cours';
    }
  }

  async generateConversationTitle(messages) {
    if (!this.isAvailable() || !messages?.length) return null;
    const conversationText = messages.slice(0, 12)
      .map(message => `${message.role}: ${message.content}`)
      .join('\n');
    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: [{
        role: 'system',
        content: 'Propose un titre concis de 3 a 8 mots pour cette conversation. Reponds uniquement avec le titre, dans la langue de l echange.',
      }, { role: 'user', content: conversationText }],
      max_tokens: 32,
      temperature: 0.2,
    });
    return response.choices[0].message.content.trim().replace(/^['"]|['"]$/g, '');
  }

  // Générer un embedding pour un élément de la base de connaissances
  async generateKnowledgeEmbedding(knowledgeItem) {
    if (!this.embeddingClient) {
      return null;
    }

    try {
      // Combiner titre et contenu pour l'embedding
      const text = `${knowledgeItem.title}\n${knowledgeItem.content}`;
      const embedding = await this.generateEmbedding(text);

      return embedding ? JSON.stringify(embedding) : null;
    } catch (error) {
      console.error('Error generating knowledge embedding:', error.message);
      return null;
    }
  }

  // Analyser le sentiment d'un message (optionnel)
  async analyzeSentiment(text) {
    if (!this.isAvailable()) {
      return { sentiment: 'neutral', confidence: 0 };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{
          role: 'system',
          content: 'Analyse le sentiment de ce message. Réponds uniquement avec: "positive", "negative", ou "neutral".'
        }, {
          role: 'user',
          content: text
        }],
        max_tokens: 10,
        temperature: 0,
      });

      const sentiment = response.choices[0].message.content.trim().toLowerCase();
      return {
        sentiment: ['positive', 'negative', 'neutral'].includes(sentiment) ? sentiment : 'neutral',
        confidence: 0.8,
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      return { sentiment: 'neutral', confidence: 0 };
    }
  }

  // Test de connexion OpenAI
  async testConnection() {
    if (!this.isAvailable()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10,
      });
      return {
        success: true,
        response: response.choices[0].message.content,
        model: response.model,
      };
    } catch (error) {
      throw new Error(`OpenRouter connection failed: ${error.message}`);
    }
  }
}

// Singleton instance
const openaiService = new OpenAIService();

module.exports = openaiService;
module.exports.OpenAIService = OpenAIService;
