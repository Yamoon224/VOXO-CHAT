jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(async callback => callback({ id: 'tx-1' })) },
  Conversation: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/openaiService', () => ({
  generateChatResponse: jest.fn(async () => ({
    response: 'Réponse test',
    model: 'test-model',
    sources: [],
    tokensUsed: 12,
  })),
  generateSuggestions: jest.fn(async () => ['Question suivante']),
  analyzeSentiment: jest.fn(async () => ({ label: 'positive' })),
}));

jest.mock('../services/quotaService', () => ({
  assertCanSendMessage: jest.fn(async () => undefined),
  incrementMessageUsage: jest.fn(async () => 1),
  getQuotaStatus: jest.fn(async () => ({ remaining: 10 })),
}));

jest.mock('../services/tenantFeatureFlags', () => ({
  computeTenantFeatures: jest.fn(async () => ({})),
}));

const { Conversation, sequelize } = require('../models');
const openaiService = require('../services/openaiService');
const quotaService = require('../services/quotaService');
const attachmentContextService = require('../services/attachmentContextService');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const storageService = require('../services/storageService');
const {
  getConversationHistory,
  endConversation,
  submitMessageFeedback,
} = require('./chatController');
const { sendMessage } = require('./chatMessageController');

const tenant = { id: 'tenant-1', name: 'Tenant', settings: {} };

function responseDouble() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function conversationDouble(messages = []) {
  return {
    id: 'conversation-1',
    messages,
    metadata: {},
    status: 'active',
    changed: jest.fn(),
    update: jest.fn(async function update(payload) {
      Object.assign(this, payload);
      return this;
    }),
  };
}

describe('chatController widget contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  test('stores message IDs and returns both IDs', async () => {
    const conversation = conversationDouble();
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conversation);
    const req = {
      body: { message: 'Bonjour', sessionId: 'session-1', clientMessageId: '11111111-1111-4111-8111-111111111111' },
      tenant,
      get: () => null,
      ip: '127.0.0.1',
    };
    const res = responseDouble();
    const next = jest.fn();

    await sendMessage(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.userMessageId).toBe(req.body.clientMessageId);
    expect(res.payload.data.assistantMessageId).toEqual(expect.any(String));
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[1].metadata.inReplyTo).toBe(req.body.clientMessageId);
    expect(openaiService.generateSuggestions).not.toHaveBeenCalled();
  });

  test('réserve puis rattache une pièce dans la transaction du message', async () => {
    const conversation = conversationDouble();
    const attached = {
      id: 'attachment-1',
      category: 'document',
      extractedText: 'Texte du contrat',
      originalName: 'contrat.pdf',
      toPublicJSON: () => ({ id: 'attachment-1', name: 'contrat.pdf' }),
    };
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conversation);
    jest.spyOn(attachmentContextService, 'reserveForMessage').mockResolvedValueOnce([attached]);
    jest.spyOn(attachmentContextService, 'attachToMessage').mockResolvedValueOnce(undefined);
    jest.spyOn(widgetAttachmentService, 'loadImageBuffers').mockResolvedValueOnce([]);
    const clientMessageId = '11111111-1111-4111-8111-111111111111';

    await sendMessage({
      body: {
        message: 'Résume ce document',
        sessionId: 'session-1',
        clientMessageId,
        attachmentIds: ['attachment-1'],
      },
      tenant,
      get: () => null,
      ip: '127.0.0.1',
    }, responseDouble(), jest.fn());

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(attachmentContextService.attachToMessage).toHaveBeenCalledWith(
      [attached], tenant.id, conversation.id, clientMessageId, { id: 'tx-1' }
    );
  });

  test('generates suggestions only when enabled and the response has sources', async () => {
    const conversation = conversationDouble();
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conversation);
    openaiService.generateChatResponse.mockResolvedValueOnce({
      response: 'Le plan Pro coûte 29 euros.', model: 'test-model', tokensUsed: 12,
      sources: [{ title: 'Tarifs', snippet: '29 euros' }],
    });
    const req = {
      body: { message: 'Quels sont vos tarifs ?', sessionId: 'session-1' },
      tenant,
      get: () => null,
      ip: '127.0.0.1',
    };

    await sendMessage(req, responseDouble(), jest.fn());

    expect(openaiService.generateSuggestions).toHaveBeenCalledWith({
      response: 'Le plan Pro coûte 29 euros.',
      sources: [{ title: 'Tarifs', snippet: '29 euros' }],
    });
  });

  test('does not generate suggestions when disabled or without sources', async () => {
    const disabledTenant = { ...tenant, settings: { chatbot: { features: { autoResponseSuggestions: false } } } };
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conversationDouble());

    await sendMessage({
      body: { message: 'Bonjour', sessionId: 'session-1' }, tenant: disabledTenant, get: () => null, ip: '127.0.0.1',
    }, responseDouble(), jest.fn());

    expect(openaiService.generateSuggestions).not.toHaveBeenCalled();
  });

  test('replays an existing assistant response without calling the model or quota', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    Conversation.findOne.mockResolvedValue(conversationDouble([
      { id: userId, role: 'user', content: 'Bonjour', timestamp: '2026-01-01T00:00:00Z' },
      { id: 'assistant-1', role: 'assistant', content: 'Déjà répondu', timestamp: '2026-01-01T00:00:01Z', metadata: { inReplyTo: userId, suggestions: [] } },
    ]));
    const req = {
      body: {
        message: 'Bonjour',
        sessionId: 'session-1',
        clientMessageId: userId,
        attachmentIds: ['11111111-1111-4111-8111-111111111112'],
      },
      tenant,
    };
    const res = responseDouble();

    await sendMessage(req, res, jest.fn());

    expect(res.payload.data.idempotentReplay).toBe(true);
    expect(res.payload.data.response).toBe('Déjà répondu');
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
    expect(quotaService.assertCanSendMessage).not.toHaveBeenCalled();
  });

  test('preserves a reserved image and quota when vision is unavailable', async () => {
    const conversation = conversationDouble();
    const attached = {
      id: 'attachment-image',
      category: 'image',
      extractedText: '',
      originalName: 'photo.png',
      storageKey: 'tenant-1/conversations/photo.png',
      toPublicJSON: () => ({ id: 'attachment-image', name: 'photo.png' }),
    };
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conversation);
    jest.spyOn(attachmentContextService, 'reserveForMessage').mockResolvedValueOnce([attached]);
    jest.spyOn(widgetAttachmentService, 'loadImageBuffers')
      .mockResolvedValueOnce([Buffer.from('image')]);
    openaiService.generateChatResponse.mockRejectedValueOnce(Object.assign(
      new Error('Vision indisponible'),
      { code: 'VISION_SERVICE_UNAVAILABLE', isOperational: true }
    ));
    const next = jest.fn();

    await sendMessage({
      body: {
        message: 'Analyse cette image',
        sessionId: 'session-1',
        clientMessageId: '11111111-1111-4111-8111-111111111111',
        attachmentIds: ['attachment-image'],
      },
      tenant,
      get: () => null,
      ip: '127.0.0.1',
    }, responseDouble(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'VISION_SERVICE_UNAVAILABLE',
    }));
    expect(conversation.update).not.toHaveBeenCalled();
    expect(attachmentContextService.attachToMessage).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });

  test('returns IDs, feedback and stable indexes in history', async () => {
    Conversation.findOne.mockResolvedValue({
      ...conversationDouble([
        { id: 'user-1', role: 'user', content: 'A', timestamp: '2026-01-01T00:00:00Z' },
        { id: 'assistant-1', role: 'assistant', content: 'B', timestamp: '2026-01-01T00:00:01Z', feedback: 'up' },
      ]),
      userName: 'Ada',
      userEmail: 'ada@example.com',
    });
    const req = { params: { sessionId: 'session-1' }, query: { offset: 1, limit: 1 }, tenant };
    const res = responseDouble();

    await getConversationHistory(req, res, jest.fn());

    expect(res.payload.data.messages[0]).toMatchObject({ id: 'assistant-1', feedback: 'up', messageIndex: 1 });
  });

  test('returns a coded French error when conversation history is absent', async () => {
    Conversation.findOne.mockResolvedValue(null);
    const next = jest.fn();

    await getConversationHistory({
      params: { sessionId: 'session-absente' }, query: {}, tenant,
    }, responseDouble(), next);

    expect(Conversation.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: tenant.id, sessionId: 'session-absente' },
    }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      code: 'CONVERSATION_NOT_FOUND',
      message: 'Conversation introuvable.',
    }));
  });

  test('returns safe attachment metadata without contacting storage', async () => {
    const signedUrl = jest.spyOn(storageService, 'createSignedUrl');
    Conversation.findOne.mockResolvedValue({
      ...conversationDouble([{
        id: 'user-1', role: 'user', content: 'Fichier', timestamp: '2026-01-01T00:00:00Z',
        attachments: [{
          id: 'attachment-1', name: 'contrat.pdf', mimeType: 'application/pdf',
          size: 42, category: 'document', storageKey: 'tenant-1/private.pdf', url: 'legacy-url',
        }],
      }]),
      userName: 'Ada',
    });
    const res = responseDouble();
    const next = jest.fn();

    await getConversationHistory({
      params: { sessionId: 'session-1' }, query: {}, tenant,
    }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(signedUrl).not.toHaveBeenCalled();
    expect(res.payload.data.messages[0].attachments[0]).toEqual({
      id: 'attachment-1', name: 'contrat.pdf', mimeType: 'application/pdf',
      size: 42, category: 'document',
    });
  });

  test('updates assistant feedback by ID with a reassigned JSONB array', async () => {
    const conversation = conversationDouble([
      { id: 'user-1', role: 'user', content: 'A' },
      { id: 'assistant-1', role: 'assistant', content: 'B' },
    ]);
    const originalMessages = conversation.messages;
    Conversation.findOne.mockResolvedValue(conversation);
    const req = { params: { sessionId: 'session-1' }, body: { messageId: 'assistant-1', value: 'down' }, tenant };
    const res = responseDouble();

    await submitMessageFeedback(req, res, jest.fn());

    expect(conversation.messages).not.toBe(originalMessages);
    expect(conversation.messages[1].feedback).toBe('down');
    expect(conversation.changed).toHaveBeenCalledWith('messages', true);
    expect(res.payload.data.value).toBe('down');
  });

  test('supports legacy assistant feedback by message index', async () => {
    const conversation = conversationDouble([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B', feedback: 'up' },
    ]);
    Conversation.findOne.mockResolvedValue(conversation);
    const req = { params: { sessionId: 'session-1' }, body: { messageIndex: 1, value: null }, tenant };
    const res = responseDouble();

    await submitMessageFeedback(req, res, jest.fn());

    expect(conversation.messages[1].feedback).toBeNull();
    expect(res.payload.data).toMatchObject({ messageId: null, messageIndex: 1, value: null });
  });

  test('rejects feedback on a user message', async () => {
    Conversation.findOne.mockResolvedValue(conversationDouble([
      { id: 'user-1', role: 'user', content: 'A' },
    ]));
    const next = jest.fn();

    await submitMessageFeedback(
      { params: { sessionId: 'session-1' }, body: { messageId: 'user-1', value: 'up' }, tenant },
      responseDouble(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('rejects invalid ratings without updating the conversation', async () => {
    const conversation = conversationDouble();
    Conversation.findOne.mockResolvedValue(conversation);
    const req = { params: { sessionId: 'session-1' }, body: { rating: 3.5 }, tenant };
    const next = jest.fn();

    await endConversation(req, responseDouble(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(conversation.update).not.toHaveBeenCalled();
  });

  test('records an inactivity reason when the widget timeout route requests it', async () => {
    const conversation = { ...conversationDouble(), title: 'Conversation existante' };
    Conversation.findOne.mockResolvedValue(conversation);
    const res = responseDouble();

    await endConversation({
      params: { sessionId: 'session-1' },
      body: { metadata: { endedVia: 'widget' } },
      conversationEndReason: 'inactivity',
      tenant,
    }, res, jest.fn());

    expect(res.payload.data.status).toBe('ended');
    expect(conversation.status).toBe('ended');
    expect(conversation.metadata).toMatchObject({ endedVia: 'widget', endedBy: 'inactivity' });
  });
});
