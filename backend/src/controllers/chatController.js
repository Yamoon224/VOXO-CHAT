// backend/src/controllers/chatController.js - Version ChatGPT 5.4 Nano (OpenRouter)
const { Conversation, ConversationLabel, CommercialRequest, User, ConversationReadReceipt, ConversationPageVisit } = require('../models');
const { literal, Op } = require('sequelize');
const openaiService = require('../services/openaiService'); // Utiliser OpenAI/OpenRouter
const quotaService = require('../services/quotaService');
const attachmentContextService = require('../services/attachmentContextService');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const conversationLifecycleService = require('../services/conversationLifecycleService');
const { sortMessages, conversationDuration } = require('../services/conversationChronologyService');
const { computeTenantFeatures } = require('../services/tenantFeatureFlags');

// Service de chat principal
class ChatController {
  // Envoyer un message au chatbot
  async sendMessage(req, res, next) {
    try {
      // Log du body reçu pour debug
      console.log('Body reçu:', req.body);
      const {
        message, sessionId, clientMessageId, userId, userName, userEmail,
        attachmentIds = [], metadata = {}
      } = req.body;
      const tenant = req.tenant;

      // Une pièce jointe seule suffit : le message peut alors être vide.
      const attachments = await attachmentContextService.loadPending(tenant.id, attachmentIds);
      const messageText = (message || '').trim();

      if (!messageText && attachments.length === 0) {
        return next(new AppError('Message is required', 400, { code: 'MESSAGE_REQUIRED' }));
      }

      if (messageText.length > 2000) {
        return next(new AppError('Message too long (max 2000 characters)', 400, { code: 'MESSAGE_TOO_LONG' }));
      }

      // Générer un sessionId si non fourni
      let currentSessionId = sessionId || uuidv4();

      // Récupérer ou créer la conversation
      let conversation = await Conversation.findOne({
        where: {
          tenantId: tenant.id,
          sessionId: currentSessionId,
        },
      });

      if (conversation?.status === 'ended') {
        conversation = null;
        currentSessionId = uuidv4();
      }

      if (!conversation) {
        conversation = await Conversation.create({
          tenantId: tenant.id,
          sessionId: currentSessionId,
          userId: userId || 'anonymous',
          userName: userName || null,
          userEmail: userEmail || null,
          messages: [],
          metadata: {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            referrer: req.get('Referer'),
            aiProvider: 'chatgpt-nano',
            ...metadata,
          },
        });
      }

      const storedMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const existingUserIndex = clientMessageId
        ? storedMessages.findIndex(item => item.id === clientMessageId && item.role === 'user')
        : -1;
      const existingAssistant = existingUserIndex >= 0
        ? storedMessages.slice(existingUserIndex + 1).find(item => (
          item.role === 'assistant' && item.metadata?.inReplyTo === clientMessageId
        ))
        : null;

      if (existingAssistant) {
        return successResponse(res, {
          sessionId: currentSessionId,
          response: existingAssistant.content,
          userMessageId: clientMessageId,
          assistantMessageId: existingAssistant.id,
          sources: existingAssistant.metadata?.sources || [],
          suggestions: existingAssistant.metadata?.suggestions || [],
          conversationId: conversation.id,
          quota: await quotaService.getQuotaStatus(tenant),
          idempotentReplay: true,
          metadata: {
            model: existingAssistant.metadata?.model,
            tokensUsed: existingAssistant.metadata?.tokensUsed,
            provider: existingAssistant.metadata?.provider,
            timestamp: existingAssistant.timestamp,
          },
        }, 'Message already processed');
      }

      await quotaService.assertCanSendMessage(tenant);

      const userMessage = existingUserIndex >= 0 ? storedMessages[existingUserIndex] : {
        id: clientMessageId || uuidv4(),
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
        // Métadonnées sûres uniquement : ni clé de stockage, ni binaire.
        ...(attachments.length > 0 && {
          attachments: attachments.map(item => item.toPublicJSON()),
        }),
      };

      const historySource = existingUserIndex >= 0
        ? storedMessages.slice(0, existingUserIndex)
        : storedMessages;
      const conversationHistory = historySource.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Contexte éphémère des pièces jointes : rien n'est indexé durablement.
      const attachmentContext = attachmentContextService.buildTextContext(attachments, messageText);
      const images = attachments.length > 0
        ? await widgetAttachmentService.loadImageBuffers(tenant.id, attachments)
        : [];

      // Générer la réponse IA avec OpenAI/OpenRouter
      const aiResponse = await openaiService.generateChatResponse(
        tenant.id,
        messageText,
        conversationHistory,
        tenant.settings,
        tenant.name,
        {
          attachmentContext,
          images,
          locale: metadata.locale || req.locale,
          tenantFeatures: await computeTenantFeatures(tenant),
        }
      );

      const automaticSuggestionsEnabled = tenant.settings?.chatbot?.features?.autoResponseSuggestions !== false;
      let suggestions = [];
      if (automaticSuggestionsEnabled && aiResponse.sources?.length > 0) {
        try {
          suggestions = await openaiService.generateSuggestions({
            response: aiResponse.response,
            sources: aiResponse.sources,
          });
        } catch (error) {
          console.warn('Erreur génération suggestions:', error.message);
        }
      }

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
        metadata: {
          model: aiResponse.model,
          sources: aiResponse.sources,
          tokensUsed: aiResponse.tokensUsed,
          provider: 'chatgpt-nano',
          suggestions,
          inReplyTo: userMessage.id,
          ...(attachments.length > 0 && { usedVision: Boolean(aiResponse.usedVision) }),
        },
      };

      const updatedMessages = existingUserIndex >= 0
        ? [...storedMessages, assistantMessage]
        : [...storedMessages, userMessage, assistantMessage];
      await conversation.update({
        messages: updatedMessages,
        status: 'active',
        // Mettre à jour le nom/email si fourni plus tard
        ...(userName && { userName }),
        ...(userEmail && { userEmail }),
      });

      // Rattachement après coup : la pièce devient inutilisable pour un autre
      // message, ce qui interdit le rejeu.
      await attachmentContextService.attachToMessage(attachments, conversation.id, userMessage.id);

      await quotaService.incrementMessageUsage(tenant.id);

      // Réponse
      successResponse(res, {
        sessionId: currentSessionId,
        response: aiResponse.response,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        sources: aiResponse.sources,
        suggestions: suggestions,
        conversationId: conversation.id,
        quota: await quotaService.getQuotaStatus(tenant),
        metadata: {
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          provider: 'chatgpt-nano',
          timestamp: new Date().toISOString(),
        },
      }, 'Message processed successfully');

    } catch (error) {
      console.error('Erreur dans sendMessage:', error);
      next(error);
    }
  }

  // Récupérer l'historique d'une conversation
  async getConversationHistory(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const tenant = req.tenant;

      const conversation = await Conversation.findOne({
        where: {
          tenantId: tenant.id,
          sessionId,
        },
        include: [
          { model: User, as: 'assignedAgent', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: ConversationLabel, as: 'labels', attributes: ['id', 'name', 'color'], through: { attributes: [] } },
        ],
      });

      if (!conversation) {
        return next(new AppError('Conversation introuvable.', 404, { code: 'CONVERSATION_NOT_FOUND' }));
      }

      // Paginer les messages
      const rawMessages = sortMessages(conversation.messages)
        .filter(msg => req.user || msg.role !== 'internal_note')
        .slice(Number(offset), Number(offset) + Number(limit));
      const messages = rawMessages
        .map((msg, index) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
          feedback: msg.feedback ?? null,
          messageIndex: Number(offset) + index,
          // Métadonnées sûres déjà stockées dans le message : ni clé de
          // stockage, ni binaire. Le lien se demande à la volée.
          ...(msg.attachments?.length && {
            attachments: msg.attachments.map(item => ({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              size: item.size,
              category: item.category,
            })),
          }),
        }));
      const pageHistory = ConversationPageVisit ? await ConversationPageVisit.findAll({
        where: { tenantId: tenant.id, conversationId: conversation.id },
        attributes: ['url', 'visitedAt', 'messageId'], order: [['visitedAt', 'ASC']],
      }) : [];

      successResponse(res, {
        sessionId,
        userName: conversation.userName,
        userEmail: conversation.userEmail,
        title: conversation.title,
        endedAt: conversation.endedAt,
        messages,
        totalMessages: conversation.messages.length,
        conversationStatus: conversation.status,
        handoffStatus: conversation.handoffStatus,
        handoffReason: conversation.handoffReason,
        handoffRequestedAt: conversation.handoffRequestedAt,
        humanTakenAt: conversation.humanTakenAt,
        assignedAgent: conversation.assignedAgent ? { id: conversation.assignedAgent.id, name: [conversation.assignedAgent.firstName, conversation.assignedAgent.lastName].filter(Boolean).join(' ') || conversation.assignedAgent.email } : null,
        priority: {
          value: conversation.priority,
          source: conversation.prioritySource,
          reason: conversation.priorityReason,
          updatedAt: conversation.priorityUpdatedAt,
        },
        labels: conversation.labels || [],
        pageHistory: pageHistory.length ? pageHistory : (conversation.metadata?.url ? [{ url: conversation.metadata.url, visitedAt: conversation.createdAt, legacy: true }] : []),
        metadata: conversation.metadata,
        summary: conversation.messages.length > 4 ? 'Conversation avec assistant IA' : null,
      }, 'Conversation history retrieved');

    } catch (error) {
      next(error);
    }
  }

  // Lister les conversations d'un tenant
  async getConversations(req, res, next) {
    try {
      const {
        page = 1, limit = 20, status, userId, priority, labelId,
        sortBy = 'updatedAt', sortOrder = 'desc',
      } = req.query;
      const tenant = req.tenant;

      const whereClause = {
        tenantId: tenant.id,
      };

      if (status) {
        whereClause.status = status;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const labelIds = labelId ? String(labelId).split(',') : [];
      const labelInclude = {
        model: ConversationLabel,
        as: 'labels',
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] },
        ...(labelIds.length ? { where: { id: { [Op.in]: labelIds } }, required: true } : { required: false }),
      };
      const direction = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const order = sortBy === 'priority'
        ? [[literal(`CASE "Conversation"."priority" WHEN 'critical' THEN 4 WHEN 'urgent' THEN 3 WHEN 'important' THEN 2 ELSE 1 END`), direction], ['updatedAt', 'DESC']]
        : [['updatedAt', direction]];

      const { count, rows: conversations } = await Conversation.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        order,
        distinct: true,
        attributes: ['id', 'sessionId', 'userId', 'userName', 'userEmail', 'title', 'endedAt', 'status', 'channel', 'handoffStatus', 'handoffReason', 'assignedAgentId', 'handoffRequestedAt', 'humanTakenAt', 'createdAt', 'updatedAt', 'messages', 'metadata', 'priority', 'prioritySource', 'priorityReason', 'priorityUpdatedAt'],
        include: [{
          model: CommercialRequest,
          as: 'commercialRequests',
          required: false,
          attributes: ['id', 'knowledgeBaseId', 'reason', 'quantity', 'customerName', 'customerPhone', 'customerEmail', 'status', 'category', 'outcomeStatus', 'resolvedAt', 'resolutionReason', 'amount', 'createdAt'],
        }, { model: User, as: 'assignedAgent', required: false, attributes: ['id', 'firstName', 'lastName', 'email'] }, labelInclude],
      });
      const receipts = ConversationReadReceipt ? await ConversationReadReceipt.findAll({
        where: { tenantId: tenant.id, userId: req.user.id, conversationId: conversations.map(item => item.id) },
        attributes: ['conversationId', 'lastReadAt'],
      }) : [];
      const readAtByConversation = new Map(receipts.map(item => [item.conversationId, item.lastReadAt]));

      // Simplification : pas de résumés IA en rafale pour la liste (trop lent)
      const conversationsWithSummary = conversations.map(conv => {
        let summary = 'Nouvelle conversation';
        const orderedMessages = sortMessages(conv.messages || []);
        
        if (orderedMessages.length > 0) {
          const lastUserMessage = [...orderedMessages].reverse().find(m => m.role === 'user');
          if (lastUserMessage) {
            summary = lastUserMessage.content.substring(0, 100) + (lastUserMessage.content.length > 100 ? '...' : '');
          } else {
            summary = orderedMessages[orderedMessages.length - 1].content.substring(0, 100);
          }
        }

        return {
          id: conv.id,
          sessionId: conv.sessionId,
          userId: conv.userId,
          userName: conv.userName,
          userEmail: conv.userEmail,
          title: conv.title,
          endedAt: conv.endedAt,
          status: conv.status,
          channel: conv.channel,
          duration: conversationDuration(conv),
          handoffStatus: conv.handoffStatus,
          handoffReason: conv.handoffReason,
          handoffRequestedAt: conv.handoffRequestedAt,
          humanTakenAt: conv.humanTakenAt,
          assignedAgent: conv.assignedAgent ? { id: conv.assignedAgent.id, name: [conv.assignedAgent.firstName, conv.assignedAgent.lastName].filter(Boolean).join(' ') || conv.assignedAgent.email } : null,
          priority: {
            value: conv.priority,
            source: conv.prioritySource,
            reason: conv.priorityReason,
            updatedAt: conv.priorityUpdatedAt,
          },
          labels: conv.labels || [],
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          isUnread: (() => {
            const lastUser = [...orderedMessages].reverse().find(message => message.role === 'user');
            const readAt = readAtByConversation.get(conv.id);
            return Boolean(lastUser && (!readAt || new Date(lastUser.timestamp) > new Date(readAt)));
          })(),
          messageCount: orderedMessages.length,
          messages: orderedMessages,
          summary,
          metadata: conv.metadata,
          aiProvider: conv.metadata?.aiProvider || 'chatgpt-nano',
          commercialRequests: conv.commercialRequests || [],
        };
      });


      const pagination = {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / Number(limit)),
      };

      successResponse(res, {
        conversations: conversationsWithSummary,
        pagination,
      }, 'Conversations retrieved', 200, 'CONVERSATIONS_RETRIEVED');

    } catch (error) {
      next(error);
    }
  }

  // Mettre fin à une conversation avec analyse de sentiment
  async endConversation(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { rating, feedback } = req.body;
      const tenant = req.tenant;

      if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        return next(new AppError('Rating must be an integer between 1 and 5', 400, { code: 'INVALID_RATING' }));
      }
      if (feedback != null && (typeof feedback !== 'string' || feedback.length > 1000)) {
        return next(new AppError('Feedback must be a string of 1000 characters or fewer', 400, { code: 'INVALID_FEEDBACK' }));
      }

      const conversation = await Conversation.findOne({
        where: {
          tenantId: tenant.id,
          sessionId,
        },
      });

      if (!conversation) {
        return next(new AppError('Conversation introuvable.', 404, { code: 'CONVERSATION_NOT_FOUND' }));
      }

      const lifecycleMetadata = { ...(req.body.metadata || {}) };

      if (rating != null) await conversation.update({ satisfactionRating: rating });

      if (feedback) {
        // Analyser le sentiment du feedback avec OpenAI
        let sentimentAnalysis = null;
        try {
          sentimentAnalysis = await openaiService.analyzeSentiment(feedback);
        } catch (error) {
          console.warn('Erreur analyse sentiment:', error.message);
        }

        lifecycleMetadata.feedback = feedback;
        lifecycleMetadata.feedbackSentiment = sentimentAnalysis;
      }

      const endReason = req.conversationEndReason === 'inactivity' ? 'inactivity' : 'manual';
      await conversationLifecycleService.endConversation(conversation, endReason, lifecycleMetadata);

      successResponse(res, {
        sessionId,
        status: 'ended',
        message: 'Conversation ended successfully',
        sentiment: lifecycleMetadata.feedbackSentiment,
      });

    } catch (error) {
      next(error);
    }
  }

  async updateConversationTitle(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      const conversation = await Conversation.findOne({
        where: { tenantId: req.tenant.id, sessionId },
      });
      if (!conversation) return next(new AppError('Conversation introuvable.', 404, { code: 'CONVERSATION_NOT_FOUND' }));
      await conversation.update({ title: title.trim() });
      return successResponse(res, { sessionId, title: conversation.title }, 'Titre mis a jour', 200, 'CONVERSATION_TITLE_UPDATED');
    } catch (error) {
      return next(error);
    }
  }

  async submitMessageFeedback(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { messageId, messageIndex, value } = req.body;
      const tenant = req.tenant;

      if (!['up', 'down', null].includes(value)) {
        return next(new AppError('Feedback value must be up, down or null', 400, { code: 'INVALID_FEEDBACK_VALUE' }));
      }

      const conversation = await Conversation.findOne({
        where: { tenantId: tenant.id, sessionId },
      });
      if (!conversation) return next(new AppError('Conversation introuvable.', 404, { code: 'CONVERSATION_NOT_FOUND' }));

      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      let targetIndex = messageId
        ? messages.findIndex(item => item.id === messageId)
        : -1;
      if (targetIndex < 0 && Number.isInteger(messageIndex)) targetIndex = messageIndex;

      const target = messages[targetIndex];
      if (!target) return next(new AppError('Message not found', 404, { code: 'MESSAGE_NOT_FOUND' }));
      if (target.role !== 'assistant') {
        return next(new AppError('Feedback is only allowed on assistant messages', 400, { code: 'FEEDBACK_NOT_ALLOWED' }));
      }

      const updatedMessages = messages.map((item, index) => (
        index === targetIndex ? { ...item, feedback: value } : item
      ));
      if (typeof conversation.changed === 'function') conversation.changed('messages', true);
      await conversation.update({ messages: updatedMessages });

      successResponse(res, {
        messageId: target.id || null,
        messageIndex: targetIndex,
        value,
      }, 'Message feedback saved', 200, 'MESSAGE_FEEDBACK_SAVED');
    } catch (error) {
      next(error);
    }
  }

  // Test de la connectivité IA (OpenRouter)
  async testAI(req, res, next) {
    try {
      if (!openaiService.isAvailable()) {
        return next(new AppError('AI service is not configured', 503, { code: 'AI_SERVICE_UNAVAILABLE' }));
      }

      const testResult = await openaiService.testConnection();

      successResponse(res, {
        ...testResult,
        provider: 'chatgpt-nano',
        message: 'AI connection successful'
      }, 'AI connection test successful', 200, 'AI_TEST_SUCCESS');
    } catch (error) {
      // Message de diagnostic (endpoint de test technique) : on le renvoie tel
      // quel plutôt que le libellé générique du registre.
      next(new AppError(`AI test failed: ${error.message}`, 503, {
        code: 'AI_SERVICE_UNAVAILABLE',
        preTranslated: true,
      }));
    }
  }

  // Nouvelle fonctionnalité : Améliorer une réponse
  async improveResponse(req, res, next) {
    try {
      const { message, context } = req.body;

      if (!openaiService.isAvailable()) {
        return next(new AppError('AI service not available', 503, { code: 'AI_SERVICE_UNAVAILABLE' }));
      }

      const suggestions = await openaiService.generateSuggestions({
        response: message,
        sources: context ? [{ title: 'Contexte', snippet: context }] : [],
      });

      successResponse(res, {
        originalMessage: message,
        suggestions,
      }, 'Response suggestions generated', 200, 'SUGGESTIONS_GENERATED');

    } catch (error) {
      next(error);
    }
  }
}

const chatController = new ChatController();

module.exports = {
  sendMessage: chatController.sendMessage.bind(chatController),
  getConversationHistory: chatController.getConversationHistory.bind(chatController),
  getConversations: chatController.getConversations.bind(chatController),
  endConversation: chatController.endConversation.bind(chatController),
  updateConversationTitle: chatController.updateConversationTitle.bind(chatController),
  submitMessageFeedback: chatController.submitMessageFeedback.bind(chatController),
  testAI: chatController.testAI.bind(chatController),
  improveResponse: chatController.improveResponse.bind(chatController),
};
