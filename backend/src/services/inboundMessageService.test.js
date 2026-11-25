const mockConversation = {
  messages: [],
  userName: null,
  id: 'conversation-1',
  sessionId: 'session-1',
  update: jest.fn(),
};

jest.mock('../models', () => ({
  Conversation: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ChannelUser: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
  },
  MessageAttachment: { update: jest.fn() },
  sequelize: { transaction: jest.fn(async callback => callback({})) },
}));
jest.mock('./openaiService', () => ({
  generateChatResponse: jest.fn(),
  generateSuggestions: jest.fn(),
}));
jest.mock('./quotaService', () => ({
  assertCanSendMessage: jest.fn(),
  incrementMessageUsage: jest.fn(),
}));
jest.mock('./tenantFeatureFlags', () => ({
  computeTenantFeatures: jest.fn(async () => ({})),
}));
jest.mock('./conversationEventService', () => ({ publish: jest.fn() }));
jest.mock('./conversationAttentionService', () => ({
  afterIncomingMessage: jest.fn(async () => undefined),
}));
jest.mock('./conversationHandoffService', () => ({
  WAITING_MESSAGE: 'Un conseiller va vous répondre.',
  detectExplicitReason: jest.fn(() => null),
  detectCommercialIntent: jest.fn(() => null),
  requestHandoff: jest.fn(async () => undefined),
  handoffView: jest.fn(() => ({ status: 'human' })),
}));
jest.mock('./mediaProcessingService', () => ({
  process: jest.fn(),
  storeForHuman: jest.fn(),
}));
jest.mock('./inboundDeduplicationService', () => ({
  claim: jest.fn(),
  release: jest.fn(),
}));
jest.mock('../utils/channelLogger', () => ({
  logChannelEvent: jest.fn(),
}));

const { Conversation, ChannelUser, MessageAttachment } = require('../models');
const openaiService = require('./openaiService');
const quotaService = require('./quotaService');
const mediaProcessingService = require('./mediaProcessingService');
const deduplicationService = require('./inboundDeduplicationService');
const inboundMessageService = require('./inboundMessageService');

const tenant = {
  id: 'tenant-1',
  name: 'Tenant test',
  settings: {},
};

function message(overrides = {}) {
  return {
    version: 1,
    channel: 'telegram',
    provider: 'telegram',
    direction: 'inbound',
    externalMessageId: 'message-1',
    externalConversationId: 'chat-1',
    sender: {
      externalUserId: 'user-1',
      displayName: 'Alice',
      username: 'alice',
    },
    type: 'text',
    text: 'Bonjour',
    media: null,
    occurredAt: '2026-06-30T12:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('inboundMessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversation.messages = [];
    mockConversation.userName = null;
    mockConversation.handoffStatus = 'ai';
    mockConversation.update.mockResolvedValue(mockConversation);
    Conversation.findOne.mockResolvedValue(mockConversation);
    Conversation.create.mockResolvedValue(mockConversation);
    ChannelUser.findOrCreate.mockResolvedValue([{
      id: 'channel-user-1',
      tenantId: 'tenant-1',
      channel: 'telegram',
      externalUserId: 'user-1',
    }, true]);
    quotaService.assertCanSendMessage.mockResolvedValue(undefined);
    quotaService.incrementMessageUsage.mockResolvedValue(1);
    deduplicationService.claim.mockResolvedValue(true);
    deduplicationService.release.mockResolvedValue(undefined);
    mediaProcessingService.process.mockResolvedValue({
      userIntent: 'Résume ce document',
      supplementalContext: 'Contenu extrait du média',
      attachment: {
        type: 'document',
        title: 'document',
        mimeType: 'application/pdf',
        sizeBytes: 120,
        extractionMethod: 'direct',
      },
    });
    mediaProcessingService.storeForHuman.mockResolvedValue({ attachments: [], attachment: null });
    MessageAttachment.update.mockResolvedValue([1]);
    openaiService.generateChatResponse.mockResolvedValue({
      response: 'Reponse test',
      model: 'gpt-test',
      tokensUsed: 12,
      sources: [],
    });
    openaiService.generateSuggestions.mockResolvedValue([]);
  });

  it('processes and persists a text message with tenant isolation', async () => {
    const sendReply = jest.fn().mockResolvedValue(undefined);
    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message(),
      sendReply,
    });

    expect(result).toEqual({ status: 'processed' });
    expect(Conversation.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        externalUserId: 'user-1',
        channel: 'telegram',
        status: 'active',
      },
    });
    expect(ChannelUser.findOrCreate).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'user-1',
      },
      defaults: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'user-1',
      },
    });
    expect(openaiService.generateChatResponse).toHaveBeenCalled();
    expect(sendReply).toHaveBeenCalledWith('Reponse test', {
      suggestions: [],
      assistantMessageId: expect.any(String),
      removeKeyboard: true,
    });
    expect(mockConversation.update).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          role: 'user',
          content: 'Bonjour',
          metadata: expect.objectContaining({
            type: 'text',
            externalMessageId: 'message-1',
          }),
        }),
      ]),
    }));
    expect(quotaService.incrementMessageUsage).toHaveBeenCalledWith('tenant-1', 2);
    const savedMessages = mockConversation.update.mock.calls[0][0].messages;
    expect(savedMessages[1].metadata.inReplyTo).toBe(savedMessages[0].id);
  });

  test.each([
    ['telegram', 'image'],
    ['telegram', 'document'],
    ['telegram', 'voice'],
    ['whatsapp', 'image'],
    ['whatsapp', 'document'],
    ['whatsapp', 'voice'],
  ])(
    'processes %s %s media with ephemeral context',
    async (channel, type) => {
      const sendReply = jest.fn().mockResolvedValue(undefined);
      const loadMedia = jest.fn();
      const result = await inboundMessageService.processInboundMessage({
        tenant,
        message: message({
          type,
          channel,
          provider: channel === 'whatsapp' ? 'meta' : 'telegram',
          text: null,
          media: { reference: `${type}-1` },
        }),
        sendReply,
        loadMedia,
      });

      expect(result).toEqual({ status: 'processed' });
      expect(mediaProcessingService.process).toHaveBeenCalledWith({
        tenant,
        message: expect.objectContaining({ type }),
        loadMedia,
      });
      expect(openaiService.generateChatResponse).toHaveBeenCalledWith(
        'tenant-1',
        'Résume ce document',
        [],
        {},
        'Tenant test',
        expect.objectContaining({
          supplementalContext: 'Contenu extrait du média',
        })
      );
      // Un vocal stocke la transcription telle quelle ; les autres types gardent le format détaillé.
      const expectedStored = type === 'voice'
        ? '[VOCAL] Résume ce document'
        : 'Contenu extrait du média';
      expect(mockConversation.update).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining(expectedStored),
            metadata: expect.objectContaining({
              type,
              attachment: expect.objectContaining({ title: 'document' }),
            }),
          }),
        ]),
      }));
      expect(quotaService.incrementMessageUsage).toHaveBeenCalledWith('tenant-1', 2);
    }
  );

  test('stocke un média en reprise humaine sans lancer OCR, vision ni réponse IA', async () => {
    const sendReply = jest.fn().mockResolvedValue(undefined);
    const loadMedia = jest.fn();
    const attachment = {
      id: 'attachment-1',
      toPublicJSON: () => ({ id: 'attachment-1', name: 'catalogue.pdf', category: 'document' }),
    };
    mockConversation.handoffStatus = 'human';
    mediaProcessingService.storeForHuman.mockResolvedValue({
      attachments: [attachment],
      attachment: { title: 'catalogue.pdf', type: 'document' },
    });

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'document', text: null, media: { reference: 'document-1' } }),
      sendReply,
      loadMedia,
    });

    expect(result).toEqual({ status: 'processed' });
    expect(mediaProcessingService.storeForHuman).toHaveBeenCalledWith({
      tenant, message: expect.objectContaining({ type: 'document' }), loadMedia,
    });
    expect(mediaProcessingService.process).not.toHaveBeenCalled();
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
    expect(sendReply).not.toHaveBeenCalled();
    expect(mockConversation.update).toHaveBeenCalledWith(expect.objectContaining({
      messages: [expect.objectContaining({ attachments: [attachment.toPublicJSON()] })],
    }), expect.anything());
  });

  it('blames the file only when the media stage itself failed', async () => {
    const failure = Object.assign(new Error('sharp: unsupported image'), { stage: 'extract' });
    mediaProcessingService.process.mockRejectedValueOnce(failure);
    const sendReply = jest.fn().mockResolvedValue(undefined);

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'image', text: null, media: { reference: 'image-1' } }),
      sendReply,
      loadMedia: jest.fn(),
    });

    expect(sendReply).toHaveBeenCalledWith(inboundMessageService.MEDIA_FAILURE_MESSAGE);
    expect(result.status).toBe('failed');
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
    expect(deduplicationService.release).toHaveBeenCalled();
  });

  it('reports a technical failure when the AI fails after the media was read', async () => {
    openaiService.generateChatResponse.mockRejectedValueOnce(
      Object.assign(new Error('401 Incorrect API key provided'), { code: 'invalid_api_key' })
    );
    const sendReply = jest.fn().mockResolvedValue(undefined);

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'voice', text: null, media: { reference: 'voice-1' } }),
      sendReply,
      loadMedia: jest.fn(),
    });

    expect(sendReply).toHaveBeenCalledWith(inboundMessageService.TECHNICAL_FAILURE_MESSAGE);
    expect(sendReply).not.toHaveBeenCalledWith(inboundMessageService.MEDIA_FAILURE_MESSAGE);
    expect(result).toEqual({ status: 'failed', reason: 'invalid_api_key' });
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });

  it('keeps the business message of an operational media error', async () => {
    const { AppError } = require('../middleware/errorMiddleware');
    mediaProcessingService.process.mockRejectedValueOnce(
      new AppError('Cette image est illisible.', 422, { code: 'IMAGE_UNREADABLE' })
    );
    const sendReply = jest.fn().mockResolvedValue(undefined);

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'image', text: null, media: { reference: 'image-1' } }),
      sendReply,
      loadMedia: jest.fn(),
    });

    expect(sendReply).toHaveBeenCalledWith('Cette image est illisible.');
    expect(result).toEqual({ status: 'failed', reason: 'IMAGE_UNREADABLE' });
  });

  it('ignores an already claimed media message', async () => {
    deduplicationService.claim.mockResolvedValue(false);
    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'image', text: null, media: { reference: 'image-1' } }),
      sendReply: jest.fn(),
      loadMedia: jest.fn(),
    })).resolves.toEqual({ status: 'ignored', reason: 'duplicate_message' });
    expect(mediaProcessingService.process).not.toHaveBeenCalled();
  });

  it('sends and persists Telegram suggestions when the response has sources', async () => {
    openaiService.generateChatResponse.mockResolvedValueOnce({
      response: 'Le plan Pro coûte 29 euros.', model: 'gpt-test', tokensUsed: 12,
      sources: [{ title: 'Tarifs', snippet: '29 euros' }],
    });
    openaiService.generateSuggestions.mockResolvedValueOnce(['Comment souscrire ?', 'Puis-je changer de formule ?']);
    const sendReply = jest.fn().mockResolvedValue(undefined);

    await inboundMessageService.processInboundMessage({ tenant, message: message(), sendReply });

    expect(sendReply).toHaveBeenCalledWith('Le plan Pro coûte 29 euros.', expect.objectContaining({
      suggestions: ['Comment souscrire ?', 'Puis-je changer de formule ?'],
      assistantMessageId: expect.any(String),
    }));
    const storedMessages = mockConversation.update.mock.calls[0][0].messages;
    expect(storedMessages[1].metadata.suggestions).toEqual(['Comment souscrire ?', 'Puis-je changer de formule ?']);
  });

  it('resolves a valid Telegram suggestion from the active conversation', async () => {
    mockConversation.messages = [{
      id: 'assistant-1', role: 'assistant', content: 'Réponse',
      metadata: { suggestions: ['Quels sont vos tarifs ?'] },
    }];
    const sendReply = jest.fn().mockResolvedValue(undefined);

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({
        externalMessageId: 'callback-1',
        text: '__telegram_suggestion__',
        metadata: { telegramSuggestion: { assistantMessageId: 'assistant-1', index: 0 } },
      }),
      sendReply,
    });

    expect(result).toEqual({ status: 'processed' });
    expect(openaiService.generateChatResponse).toHaveBeenCalledWith(
      'tenant-1', 'Quels sont vos tarifs ?', expect.any(Array), {}, 'Tenant test',
      { tenantFeatures: {} }
    );
    expect(mockConversation.update).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ content: 'Quels sont vos tarifs ?' })]),
    }));
  });

  it('ignores invalid Telegram suggestions without calling the AI', async () => {
    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: message({
        externalMessageId: 'callback-invalid',
        metadata: { telegramSuggestion: { assistantMessageId: 'missing', index: 0 } },
      }),
      sendReply: jest.fn(),
    });

    expect(result).toEqual({ status: 'ignored', reason: 'invalid_suggestion' });
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
  });

  it('uses an in-memory image for AI without persisting its binary data', async () => {
    mediaProcessingService.process.mockResolvedValue({
      userIntent: 'Analyse cette image',
      supplementalContext: 'Texte OCR',
      images: [Buffer.from('private-image-bytes')],
      attachment: {
        type: 'image',
        title: 'photo',
        mimeType: 'image/png',
        sizeBytes: 19,
        extractionMethod: 'tesseract',
      },
    });

    await inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'image', text: null, media: { reference: 'image-1' } }),
      sendReply: jest.fn().mockResolvedValue(undefined),
      loadMedia: jest.fn(),
    });

    expect(openaiService.generateChatResponse).toHaveBeenCalledWith(
      'tenant-1',
      'Analyse cette image',
      [],
      {},
      'Tenant test',
      expect.objectContaining({ images: [expect.any(Buffer)] })
    );
    const storedMessages = mockConversation.update.mock.calls[0][0].messages;
    const storedUserMessage = storedMessages.find(item => item.role === 'user');
    expect(storedUserMessage.metadata).not.toHaveProperty('images');
    expect(JSON.stringify(storedUserMessage)).not.toContain('private-image-bytes');
  });

  it('replies in French and does not consume quota when media processing fails', async () => {
    mediaProcessingService.process.mockRejectedValue({
      isOperational: true,
      code: 'MEDIA_TOO_LARGE',
      message: 'Le fichier est trop volumineux',
    });
    const sendReply = jest.fn().mockResolvedValue(undefined);

    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'document', text: null, media: { reference: 'doc-1' } }),
      sendReply,
      loadMedia: jest.fn(),
    })).resolves.toEqual({ status: 'failed', reason: 'MEDIA_TOO_LARGE' });
    expect(sendReply).toHaveBeenCalledWith('Le fichier est trop volumineux');
    expect(deduplicationService.release).toHaveBeenCalled();
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });

  it('preserves quota handling', async () => {
    quotaService.assertCanSendMessage.mockRejectedValue({
      code: 'QUOTA_EXCEEDED',
      message: 'Quota atteint',
    });
    const sendReply = jest.fn().mockResolvedValue(undefined);

    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message(),
      sendReply,
    })).resolves.toEqual({ status: 'blocked', reason: 'quota_exceeded' });
    expect(sendReply).toHaveBeenCalledWith('Quota atteint');
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });

  it('keeps an image retryable and does not consume quota when vision fails', async () => {
    mediaProcessingService.process.mockResolvedValue({
      userIntent: 'Analyse cette image',
      supplementalContext: '',
      images: [Buffer.from('image')],
      attachment: { type: 'image', title: 'Photo' },
    });
    openaiService.generateChatResponse.mockRejectedValue({
      isOperational: true,
      code: 'VISION_SERVICE_UNAVAILABLE',
      message: "L'analyse de l'image est temporairement indisponible. Veuillez réessayer.",
    });
    const sendReply = jest.fn().mockResolvedValue(undefined);

    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message({ type: 'image', media: { reference: 'image-1' } }),
      sendReply,
      loadMedia: jest.fn(),
    })).resolves.toEqual({ status: 'failed', reason: 'VISION_SERVICE_UNAVAILABLE' });
    expect(sendReply).toHaveBeenCalledWith(
      "L'analyse de l'image est temporairement indisponible. Veuillez réessayer."
    );
    expect(mockConversation.update).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
    expect(deduplicationService.release).toHaveBeenCalled();
  });

  it('does not persist or increment quota when sending fails', async () => {
    const sendReply = jest.fn().mockRejectedValue(new Error('Provider unavailable'));

    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message(),
      sendReply,
    })).rejects.toThrow('Provider unavailable');
    expect(mockConversation.update).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });

  it('stops before conversation and AI processing when identity mapping fails', async () => {
    ChannelUser.findOrCreate.mockRejectedValue(new Error('Mapping unavailable'));

    await expect(inboundMessageService.processInboundMessage({
      tenant,
      message: message(),
      sendReply: jest.fn(),
    })).rejects.toThrow('Mapping unavailable');
    expect(Conversation.findOne).not.toHaveBeenCalled();
    expect(openaiService.generateChatResponse).not.toHaveBeenCalled();
    expect(quotaService.incrementMessageUsage).not.toHaveBeenCalled();
  });
});
