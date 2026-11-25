const { Conversation } = require('../models');
const attention = require('../services/conversationAttentionService');
const { AppError } = require('../middleware/errorMiddleware');
const { successResponse } = require('../utils/responseUtils');

async function markRead(req, res, next) {
  try {
    const conversation = await Conversation.findOne({ where: { tenantId: req.tenant.id, sessionId: req.params.sessionId } });
    if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
    await attention.markRead(req.tenant.id, req.user.id, conversation.id);
    return successResponse(res, { sessionId: conversation.sessionId }, 'Conversation marquée comme lue');
  } catch (error) { return next(error); }
}

module.exports = { markRead };
