const { Conversation, User, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const openaiService = require('./openaiService');
const quotaService = require('./quotaService');
const attachmentContextService = require('./attachmentContextService');
const widgetAttachmentService = require('./widgetAttachmentService');
const { v4: uuidv4 } = require('uuid');
const commercialRequestService = require('./commercialRequestService');
const handoffService = require('./conversationHandoffService');
const conversationEvents = require('./conversationEventService');
const attention = require('./conversationAttentionService');
const { toProviderHistory } = require('./conversationAiHistoryService');
const { computeTenantFeatures } = require('./tenantFeatureFlags');

const ACCEPT_PATTERN = /^(oui|ok|daccord|d'accord|yes)$/i;
const DECLINE_PATTERN = /^(non|pas besoin|no)$/i;
const OFFER_MESSAGE = 'Je ne peux pas vous répondre avec certitude. Souhaitez-vous parler à un conseiller ?';

async function findOrCreateConversation(tenant, payload, requestMetadata) {
  let sessionId = payload.sessionId || uuidv4();
  let conversation = await Conversation.findOne({
    where: { tenantId: tenant.id, sessionId },
  });
  if (conversation?.status === 'ended') {
    conversation = null;
    sessionId = uuidv4();
  }
  if (!conversation) {
    conversation = await Conversation.create({
      tenantId: tenant.id,
      sessionId,
      userId: payload.userId || 'anonymous',
      userName: payload.userName || null,
      userEmail: payload.userEmail || null,
      messages: [],
      metadata: { aiProvider: 'chatgpt-nano', ...requestMetadata, ...payload.metadata },
    });
  }
  return { conversation, sessionId };
}

function findExistingReply(messages, clientMessageId) {
  const userIndex = clientMessageId
    ? messages.findIndex(item => item.id === clientMessageId && item.role === 'user')
    : -1;
  const assistant = userIndex >= 0
    ? messages.slice(userIndex + 1).find(item => (
      item.role === 'assistant' && item.metadata?.inReplyTo === clientMessageId
    ))
    : null;
  return { userIndex, assistant };
}

async function replayResponse(tenant, conversation, sessionId, clientMessageId, assistant) {
  return {
    sessionId,
    response: assistant.content,
    userMessageId: clientMessageId,
    assistantMessageId: assistant.id,
    sources: assistant.metadata?.sources || [],
    suggestions: assistant.metadata?.suggestions || [],
    conversationId: conversation.id,
    quota: await quotaService.getQuotaStatus(tenant),
    idempotentReplay: true,
    metadata: {
      model: assistant.metadata?.model,
      tokensUsed: assistant.metadata?.tokensUsed,
      provider: assistant.metadata?.provider,
      timestamp: assistant.timestamp,
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
    console.warn('Erreur génération suggestions:', error.message);
    return [];
  }
}

function createUserMessage(messageId, text, attachments, metadata = {}) {
  return {
    id: messageId,
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
    ...(metadata.url && { metadata: { url: metadata.url } }),
    ...(attachments.length > 0 && {
      attachments: attachments.map(item => item.toPublicJSON()),
    }),
  };
}

function createAssistantMessage(aiResponse, suggestions, userMessage, hasAttachments) {
  return {
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
      ...(hasAttachments && { usedVision: Boolean(aiResponse.usedVision) }),
    },
  };
}

async function persistExchange({
  conversation,
  tenant,
  payload,
  messages,
  attachments,
  userMessage,
  commercialAction,
}) {
  const commercialUpdate = commercialRequestService.conversationUpdate(
    { commercialAction }, conversation.metadata
  );
  await sequelize.transaction(async transaction => {
    await conversation.update({
      messages,
      ...commercialUpdate,
      ...(conversation.handoffStatus === 'waiting' && { status: 'escalated' }),
      ...(payload.userName && { userName: payload.userName }),
      ...(payload.userEmail && { userEmail: payload.userEmail }),
    }, { transaction });
    await attachmentContextService.attachToMessage(
      attachments,
      tenant.id,
      conversation.id,
      userMessage.id,
      transaction
    );
  });
  conversationEvents.publish(tenant.id, conversation.sessionId, { type: 'message', message: userMessage });
  conversationEvents.publish(tenant.id, conversation.sessionId, { type: 'message', message: messages.at(-1) });
}

async function processMessage({ tenant, payload, requestMetadata = {} }) {
  const attachmentIds = payload.attachmentIds || [];
  const messageText = String(payload.message || '').trim();
  if (!messageText && attachmentIds.length === 0) {
    throw new AppError('Un message ou une pièce jointe est requis.', 400, { code: 'MESSAGE_REQUIRED' });
  }
  if (messageText.length > 2000) {
    throw new AppError('Le message ne peut pas dépasser 2000 caractères.', 400, { code: 'MESSAGE_TOO_LONG' });
  }

  const { conversation, sessionId } = await findOrCreateConversation(
    tenant,
    payload,
    requestMetadata
  );
  const storedMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const existing = findExistingReply(storedMessages, payload.clientMessageId);
  if (existing.assistant) {
    return replayResponse(
      tenant,
      conversation,
      sessionId,
      payload.clientMessageId,
      existing.assistant
    );
  }

  if (conversation.handoffStatus === 'human') {
    await quotaService.assertCanSendMessage(tenant, 1);
    const messageId = payload.clientMessageId || uuidv4();
    let userMessage;
    let duplicate = false;
    await sequelize.transaction(async transaction => {
      const current = await Conversation.findOne({ where: { id: conversation.id, tenantId: tenant.id }, transaction, lock: transaction.LOCK.UPDATE });
      const messages = current.messages || [];
      userMessage = messages.find(item => item.id === messageId);
      if (userMessage) { duplicate = true; return; }
      const attachments = await attachmentContextService.reserveForMessage(tenant.id, attachmentIds, messageId, transaction);
      userMessage = createUserMessage(messageId, messageText, attachments, payload.metadata);
      await current.update({ messages: [...messages, userMessage], updatedAt: new Date() }, { transaction });
      await attachmentContextService.attachToMessage(attachments, tenant.id, current.id, messageId, transaction);
    });
    if (!duplicate) {
      conversationEvents.publish(tenant.id, sessionId, { type: 'message', message: userMessage, handoff: handoffService.handoffView(conversation) });
      await attention.afterIncomingMessage({ tenantId: tenant.id, conversation, message: userMessage });
      await quotaService.incrementMessageUsage(tenant.id);
    }
    return {
      sessionId, humanPaused: true, userMessageId: userMessage.id,
      conversationId: conversation.id, sources: [], suggestions: [],
      handoff: handoffService.handoffView(conversation), metadata: { provider: 'human-handoff', timestamp: new Date().toISOString() },
    };
  }

  await quotaService.assertCanSendMessage(tenant, 2);
  const messageId = payload.clientMessageId || uuidv4();
  const attachments = await attachmentContextService.reserveForMessage(
    tenant.id,
    attachmentIds,
    messageId
  );
  await widgetAttachmentService.prepareForAi(tenant.id, attachments);
  const userMessage = existing.userIndex >= 0
    ? storedMessages[existing.userIndex]
    : createUserMessage(messageId, messageText, attachments, payload.metadata);
  const history = toProviderHistory((existing.userIndex >= 0
    ? storedMessages.slice(0, existing.userIndex)
    : storedMessages).slice(-10));
  const attachmentContext = attachmentContextService.buildTextContext(attachments, messageText);
  const images = await widgetAttachmentService.loadImageBuffers(tenant.id, attachments);
  const offer = conversation.metadata?.handoffOffer;
  const explicitReason = handoffService.detectExplicitReason(messageText);
  const commercialReason = handoffService.detectCommercialIntent(messageText);
  if (offer && ACCEPT_PATTERN.test(messageText)) {
    await handoffService.requestHandoff({ conversation, tenant, reason: offer.reason, topic: messageText });
  } else if (offer && DECLINE_PATTERN.test(messageText)) {
    await conversation.update({ metadata: { ...conversation.metadata, handoffOffer: null } });
  }
  const flowResponse = await commercialRequestService.continueFlow({
    conversation, tenant, text: messageText,
    userName: payload.userName, userEmail: payload.userEmail,
  });
  let aiResponse = explicitReason || (offer && ACCEPT_PATTERN.test(messageText)) ? {
    response: handoffService.WAITING_MESSAGE, sources: [], model: 'human-handoff', tokensUsed: 0,
  } : flowResponse ? {
    ...flowResponse, sources: [], model: 'commercial-workflow', tokensUsed: 0,
  } : await openaiService.generateChatResponse(
    tenant.id, messageText, history, tenant.settings, tenant.name,
    { attachmentContext, images, tenantFeatures: await computeTenantFeatures(tenant) }
  );
  // Un conseiller peut prendre la main pendant la génération : ne jamais
  // publier une réponse IA devenue obsolète.
  const latestConversation = await Conversation.findOne({
    where: { id: conversation.id, tenantId: tenant.id },
    include: [{ model: User, as: 'assignedAgent', attributes: ['id', 'firstName', 'lastName', 'email'] }],
  });
  if (latestConversation?.handoffStatus === 'human') {
    const latestMessages = latestConversation.messages || [];
    if (!latestMessages.some(item => item.id === userMessage.id)) {
      await sequelize.transaction(async transaction => {
        await latestConversation.update({ messages: [...latestMessages, userMessage] }, { transaction });
        await attachmentContextService.attachToMessage(attachments, tenant.id, latestConversation.id, userMessage.id, transaction);
      });
      conversationEvents.publish(tenant.id, sessionId, { type: 'message', message: userMessage, handoff: handoffService.handoffView(latestConversation) });
    }
    return {
      sessionId, humanPaused: true, userMessageId: userMessage.id, conversationId: latestConversation.id,
      sources: [], suggestions: [], handoff: handoffService.handoffView(latestConversation),
      metadata: { provider: 'human-handoff', timestamp: new Date().toISOString() },
    };
  }
  if (explicitReason || commercialReason) {
    await handoffService.requestHandoff({ conversation, tenant, reason: explicitReason || commercialReason, topic: messageText });
  } else if (!offer && handoffService.canOfferForMessage(conversation, messageText)
    && handoffService.detectReason(messageText, aiResponse) === 'limite_ia') {
    aiResponse = { ...aiResponse, response: OFFER_MESSAGE, sources: [], handoffOffer: { reason: 'limite_ia' } };
    await conversation.update({ metadata: { ...conversation.metadata, handoffOffer: { reason: 'limite_ia' } } });
  }
  const suggestions = aiResponse.handoffOffer ? ['Oui', 'Non'] : await generateSuggestions(tenant, aiResponse);
  const assistantMessage = createAssistantMessage(
    aiResponse,
    suggestions,
    userMessage,
    attachments.length > 0
  );
  const messages = existing.userIndex >= 0
    ? [...storedMessages, assistantMessage]
    : [...storedMessages, userMessage, assistantMessage];
  await persistExchange({
    conversation,
    tenant,
    payload,
    messages,
    attachments,
    userMessage,
    commercialAction: aiResponse.commercialAction,
  });
  await attention.afterIncomingMessage({ tenantId: tenant.id, conversation, message: userMessage });
  await quotaService.incrementMessageUsage(tenant.id, existing.userIndex >= 0 ? 1 : 2);

  return {
    sessionId,
    response: aiResponse.response,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    sources: aiResponse.sources,
    suggestions,
    conversationId: conversation.id,
    quota: await quotaService.getQuotaStatus(tenant),
    metadata: {
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      provider: 'chatgpt-nano',
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = { processMessage };
