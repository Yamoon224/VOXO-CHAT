const { Conversation } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const aiService = require('./conversationPriorityAiService');
const events = require('./conversationEventService');

const pending = new Map();

function view(conversation) {
  return {
    value: conversation.priority || 'normal',
    source: conversation.prioritySource || 'default',
    reason: conversation.priorityReason || null,
    updatedAt: conversation.priorityUpdatedAt || null,
  };
}

async function findConversation(tenantId, sessionId) {
  const conversation = await Conversation.findOne({ where: { tenantId, sessionId } });
  if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
  return conversation;
}

async function updateManual(tenantId, sessionId, value) {
  const conversation = await findConversation(tenantId, sessionId);
  if (value === null) {
    await conversation.update({ prioritySource: 'default', priorityReason: null, priorityUpdatedAt: new Date() });
    schedule(tenantId, sessionId);
  } else {
    await conversation.update({ priority: value, prioritySource: 'manual', priorityReason: null, priorityUpdatedAt: new Date() });
  }
  events.publish(tenantId, sessionId, { type: 'conversation.updated', priority: view(conversation) });
  return view(conversation);
}

async function classifyConversation(tenantId, sessionId) {
  const conversation = await findConversation(tenantId, sessionId);
  if (conversation.prioritySource === 'manual') return view(conversation);
  const result = await aiService.classify(conversation.messages);
  if (!result) return view(conversation);
  await conversation.update({
    priority: result.value, prioritySource: 'ai', priorityReason: result.reason, priorityUpdatedAt: new Date(),
  });
  events.publish(tenantId, sessionId, { type: 'conversation.updated', priority: view(conversation) });
  return view(conversation);
}

function schedule(tenantId, sessionId) {
  if (process.env.NODE_ENV === 'test') return;
  const key = `${tenantId}:${sessionId}`;
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    classifyConversation(tenantId, sessionId).catch(error => console.error('Priority classification failed:', error.message));
  }, 250));
}

module.exports = { view, updateManual, classifyConversation, schedule };
