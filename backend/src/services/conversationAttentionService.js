const { ConversationReadReceipt, ConversationPageVisit, User } = require('../models');
const { hasPermission } = require('../config/permissions');
const notifications = require('./notificationService');

function isHumanConversation(conversation) {
  return ['waiting', 'human'].includes(conversation.handoffStatus);
}

async function readers(tenantId) {
  const users = await User.findAll({ where: { tenantId, isActive: true } });
  return users.filter(user => hasPermission(user, 'conversations', 'read'));
}

async function notifyIncoming({ tenantId, conversation, message }) {
  if (!isHumanConversation(conversation) || message.role !== 'user') return;
  const url = `/dashboard/conversations/details?id=${conversation.sessionId}`;
  const title = conversation.userName || 'Nouveau message client';
  await Promise.all((await readers(tenantId)).map(user => notifications.notify({
    tenantId, recipientType: 'user', recipientId: user.id, type: 'conversation.message',
    title: `Message de ${title}`, body: String(message.content || 'Pièce jointe').slice(0, 160), url,
    dedupeKey: `conversation-message:${conversation.id}:${message.id}:${user.id}`,
  })));
}

async function markRead(tenantId, userId, conversationId) {
  await ConversationReadReceipt.upsert({ tenantId, userId, conversationId, lastReadAt: new Date() });
}

async function recordPageVisit({ tenantId, conversationId, message }) {
  const url = message.metadata?.url;
  if (!url || message.role !== 'user') return;
  await ConversationPageVisit.findOrCreate({
    where: { tenantId, conversationId, messageId: message.id },
    defaults: { tenantId, conversationId, messageId: message.id, url: String(url).slice(0, 2000), visitedAt: new Date(message.timestamp || Date.now()) },
  });
}

async function afterIncomingMessage({ tenantId, conversation, message }) {
  await Promise.all([notifyIncoming({ tenantId, conversation, message }), recordPageVisit({ tenantId, conversationId: conversation.id, message })]);
}

module.exports = { afterIncomingMessage, markRead, readers };
