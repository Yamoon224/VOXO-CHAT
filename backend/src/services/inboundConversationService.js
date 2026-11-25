const { Conversation } = require('../models');
const quotaService = require('./quotaService');
const channelUserService = require('./channelUserService');
const { logChannelEvent } = require('../utils/channelLogger');
const { v4: uuidv4 } = require('uuid');

function logContext(tenant, message) {
  return {
    channel: message.channel,
    provider: message.provider,
    tenantId: tenant.id,
    externalUserId: message.sender.externalUserId,
    messageId: message.externalMessageId,
  };
}

function claimContext(tenant, message) {
  return {
    tenantId: tenant.id,
    channel: message.channel,
    externalMessageId: message.externalMessageId,
  };
}

async function findActiveConversation(tenant, message, channel = message.channel) {
  return Conversation.findOne({
    where: {
      tenantId: tenant.id,
      externalUserId: message.sender.externalUserId,
      channel,
      status: 'active',
    },
  });
}

async function getOrCreateConversation(tenant, message) {
  const conversation = await findActiveConversation(tenant, message);
  if (conversation) return { conversation, isNew: false };

  const created = await Conversation.create({
    tenantId: tenant.id,
    sessionId: uuidv4(),
    userId: message.sender.username || message.sender.externalUserId,
    userName: message.sender.displayName,
    externalUserId: message.sender.externalUserId,
    channel: message.channel,
    messages: [],
    metadata: {
      source: message.provider,
      externalConversationId: message.externalConversationId,
      ...message.metadata,
    },
  });
  return { conversation: created, isNew: true };
}

async function resolveConversation(tenant, message) {
  await channelUserService.resolveChannelUser({
    tenantId: tenant.id,
    channel: message.channel,
    externalUserId: message.sender.externalUserId,
  });
  const result = await getOrCreateConversation(tenant, message);
  logChannelEvent('info', 'conversation.resolved', {
    ...logContext(tenant, message),
    status: result.isNew ? 'created' : 'existing',
  });
  return result.conversation;
}

async function assertQuota(tenant, message, sendReply, conversation) {
  try {
    await quotaService.assertCanSendMessage(tenant, conversation?.handoffStatus === 'human' ? 1 : 2);
    return true;
  } catch (error) {
    if (error.code !== 'QUOTA_EXCEEDED') throw error;
    await sendReply(error.message);
    logChannelEvent('warn', 'message.quota_exceeded', {
      ...logContext(tenant, message),
      status: 'blocked',
    });
    return false;
  }
}

module.exports = {
  logContext,
  claimContext,
  findActiveConversation,
  getOrCreateConversation,
  resolveConversation,
  assertQuota,
};
