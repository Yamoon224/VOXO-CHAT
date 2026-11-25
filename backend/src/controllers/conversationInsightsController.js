// Analyses de conversations en lot : sentiment et résumés.
// Extraits de chatRoutes.js, où ils étaient écrits en ligne dans le routeur.
const openaiService = require('../services/openaiService');
const { Conversation } = require('../models');

/** Analyse le sentiment d'une liste de messages et en donne la répartition. */
const analyzeSentiment = async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const analyses = await Promise.all(
      messages.map(async (message) => {
        const sentiment = await openaiService.analyzeSentiment(message);
        return { message: message.substring(0, 100), sentiment };
      })
    );

    const countBy = value => analyses.filter(a => a.sentiment.sentiment === value).length;

    res.json({
      success: true,
      data: analyses,
      summary: {
        positive: countBy('positive'),
        negative: countBy('negative'),
        neutral: countBy('neutral'),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Résume plusieurs conversations d'un coup, dans la limite du tenant courant. */
const batchSummary = async (req, res, next) => {
  try {
    const { conversationIds } = req.body;

    if (!Array.isArray(conversationIds)) {
      return res.status(400).json({ error: 'Conversation IDs array required' });
    }

    const conversations = await Conversation.findAll({
      where: {
        id: conversationIds,
        tenantId: req.tenant.id,
      },
    });

    const summaries = await Promise.all(
      conversations.map(async (conv) => {
        if (!conv.messages || conv.messages.length === 0) {
          return { id: conv.id, summary: 'Conversation vide' };
        }

        const summary = await openaiService.generateConversationSummary(conv.messages);
        return {
          id: conv.id,
          sessionId: conv.sessionId,
          summary,
          messageCount: conv.messages.length,
        };
      })
    );

    res.json({
      success: true,
      data: summaries,
      message: `${summaries.length} conversations résumées`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzeSentiment, batchSummary };
