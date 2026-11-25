const openaiService = require('./openaiService');
const commercialRequestService = require('./commercialRequestService');
const handoffService = require('./conversationHandoffService');
const { toProviderHistory } = require('./conversationAiHistoryService');
const quotaService = require('./quotaService');
const attachmentContextService = require('./attachmentContextService');
const conversationEvents = require('./conversationEventService');
const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const attention = require('./conversationAttentionService');
const { computeTenantFeatures } = require('./tenantFeatureFlags');

function buildConversationHistory(conversation) {
  return toProviderHistory((conversation.messages || []).slice(-10));
}

function createStoredUserMessage(message, content, attachment = null) {
  return {
    id: uuidv4(),
    role: 'user',
    content,
    timestamp: message.occurredAt,
    metadata: {
      type: message.type,
      channel: message.channel,
      provider: message.provider,
      externalMessageId: message.externalMessageId,
      ...(attachment ? { attachment } : {}),
    },
  };
}

function publicAttachments(attachments = []) {
  return attachments.map(item => (
    typeof item.toPublicJSON === 'function' ? item.toPublicJSON() : item
  ));
}

function createStoredAssistantMessage(aiResponse, inReplyTo, hadImages = false, suggestions = []) {
  return {
    id: uuidv4(),
    role: 'assistant',
    content: aiResponse.response,
    timestamp: new Date().toISOString(),
    metadata: {
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      sources: aiResponse.sources,
      provider: 'openrouter',
      inReplyTo,
      suggestions,
      ...(hadImages ? { usedVision: Boolean(aiResponse.usedVision) } : {}),
    },
  };
}

async function generateSuggestions(tenant, aiResponse) {
  const enabled = tenant.settings?.chatbot?.features?.autoResponseSuggestions !== false;
  if (!enabled || aiResponse.sources?.length === 0) return [];
  try {
    return await openaiService.generateSuggestions({
      response: aiResponse.response,
      sources: aiResponse.sources,
    });
  } catch (error) {
    console.warn('Erreur génération suggestions canal:', error.message);
    return [];
  }
}

function buildReplyOptions(message, suggestions, assistantMessageId) {
  if (message.channel === 'telegram') {
    return {
      suggestions,
      assistantMessageId,
      removeKeyboard: suggestions.length === 0,
    };
  }
  return suggestions.length > 0 ? { suggestions, assistantMessageId } : null;
}

async function generateAndPersist({
  tenant,
  message,
  conversation,
  sendReply,
  userMessage,
  storedContent,
  aiOptions = {},
}) {
  if (conversation.handoffStatus === 'human') {
    const storedUserMessage = createStoredUserMessage(message, storedContent, aiOptions.attachment);
    const attachments = aiOptions.attachments || [];
    if (attachments.length) storedUserMessage.attachments = publicAttachments(attachments);
    await sequelize.transaction(async transaction => {
      await conversation.update({
        messages: [...(conversation.messages || []), storedUserMessage],
        updatedAt: new Date(),
      }, { transaction });
      await attachmentContextService.attachToMessage(
        attachments, tenant.id, conversation.id, storedUserMessage.id, transaction
      );
    });
    conversationEvents.publish(tenant.id, conversation.sessionId, {
      type: 'message', message: storedUserMessage, handoff: handoffService.handoffView(conversation),
    });
    await attention.afterIncomingMessage({ tenantId: tenant.id, conversation, message: storedUserMessage });
    await quotaService.incrementMessageUsage(tenant.id);
    return { paused: true };
  }
  const requestedReason = handoffService.detectExplicitReason(userMessage);
  const commercialReason = handoffService.detectCommercialIntent(userMessage);
  const flowResponse = await commercialRequestService.continueFlow({
    conversation,
    tenant,
    text: userMessage,
    userName: message.sender.displayName,
    userPhone: message.channel === 'whatsapp' ? message.sender.externalUserId : null,
  });
  let aiResponse = requestedReason ? {
    response: handoffService.WAITING_MESSAGE, sources: [], model: 'human-handoff', tokensUsed: 0,
  } : flowResponse ? {
    ...flowResponse, sources: [], model: 'commercial-workflow', tokensUsed: 0,
  } : await openaiService.generateChatResponse(
    tenant.id, userMessage, buildConversationHistory(conversation),
    tenant.settings, tenant.name, { ...aiOptions, tenantFeatures: await computeTenantFeatures(tenant) }
  );
  if (requestedReason || commercialReason) {
    await handoffService.requestHandoff({ conversation, tenant, reason: requestedReason || commercialReason, topic: userMessage });
  }
  const suggestions = await generateSuggestions(tenant, aiResponse);
  const storedUserMessage = createStoredUserMessage(
    message,
    storedContent,
    aiOptions.attachment
  );
  const storedAssistantMessage = createStoredAssistantMessage(
    aiResponse,
    storedUserMessage.id,
    Boolean(aiOptions.images?.length),
    suggestions
  );
  const replyOptions = buildReplyOptions(message, suggestions, storedAssistantMessage.id);
  if (replyOptions) await sendReply(aiResponse.response, replyOptions);
  else await sendReply(aiResponse.response);
  await conversation.update({
    userName: message.sender.displayName || conversation.userName,
    ...commercialRequestService.conversationUpdate(aiResponse, conversation.metadata),
    messages: [
      ...(conversation.messages || []),
      storedUserMessage,
      storedAssistantMessage,
    ],
    updatedAt: new Date(),
  });
  conversationEvents.publish(tenant.id, conversation.sessionId, { type: 'message', message: storedUserMessage });
  conversationEvents.publish(tenant.id, conversation.sessionId, { type: 'message', message: storedAssistantMessage });
  await attention.afterIncomingMessage({ tenantId: tenant.id, conversation, message: storedUserMessage });
  await quotaService.incrementMessageUsage(tenant.id, 2);
}

module.exports = {
  buildConversationHistory,
  createStoredUserMessage,
  createStoredAssistantMessage,
  generateSuggestions,
  buildReplyOptions,
  generateAndPersist,
};
