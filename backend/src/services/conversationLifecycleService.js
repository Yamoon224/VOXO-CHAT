const { Op } = require('sequelize');
const { Conversation } = require('../models');
const openaiService = require('./openaiService');

function fallbackTitle(messages = []) {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content);
  const text = firstUserMessage?.content || messages[0]?.content || 'Conversation sans message';
  return text.replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function generateTitle(messages) {
  if (!messages?.length || !openaiService.isAvailable()) return fallbackTitle(messages);
  try {
    const title = await openaiService.generateConversationTitle(messages);
    return title?.slice(0, 120) || fallbackTitle(messages);
  } catch (error) {
    console.warn('Erreur generation titre conversation:', error.message);
    return fallbackTitle(messages);
  }
}

async function endConversation(conversation, reason = 'manual', metadata = {}) {
  if (conversation.status === 'ended') return conversation;
  const title = conversation.title || await generateTitle(conversation.messages);
  await conversation.update({
    status: 'ended',
    handoffStatus: 'ended',
    assignedAgentId: null,
    title,
    endedAt: new Date(),
    metadata: { ...conversation.metadata, ...metadata, endedBy: reason },
  });
  require('./conversationEventService').publish(conversation.tenantId, conversation.sessionId, {
    type: 'conversation.updated', status: 'ended', handoff: { status: 'ended' },
  });
  return conversation;
}

async function closeInactiveConversations(inactivityMinutes) {
  const cutoff = new Date(Date.now() - inactivityMinutes * 60 * 1000);
  const conversations = await Conversation.findAll({
    where: { status: 'active', updatedAt: { [Op.lt]: cutoff } },
    order: [['updatedAt', 'ASC']],
  });
  let closed = 0;
  for (const conversation of conversations) {
    await endConversation(conversation, 'inactivity');
    closed += 1;
  }
  return closed;
}

module.exports = { endConversation, closeInactiveConversations, fallbackTitle };
