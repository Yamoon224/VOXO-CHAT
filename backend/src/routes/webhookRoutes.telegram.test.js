jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { tenantId: 'tenant-1' };
    next();
  },
}));

let mockTenant;

function createTenant(overrides = {}) {
  return {
    id: 'tenant-1',
    name: 'Tenant test',
    settings: {
      channels: {
        telegram: {
          botToken: 'token-1',
          botUsername: 'old_bot',
          botFirstName: 'Old Bot',
          webhookSecret: 'secret-1',
          webhookActive: true,
          ...overrides.telegram,
        },
        whatsapp: {
          provider: 'meta',
          sessionId: 'session-1',
          webhookActive: false,
          ...overrides.whatsapp,
        },
      },
    },
    update: jest.fn(async function updateTenant(payload) {
      this.settings = payload.settings;
      return this;
    }),
  };
}

jest.mock('../models', () => ({
  Tenant: {
    findByPk: jest.fn(async () => mockTenant),
    findOne: jest.fn(async () => mockTenant),
  },
  Conversation: {
    findOne: jest.fn(async () => null),
    create: jest.fn(async (payload) => ({
      ...payload,
      messages: [],
      update: jest.fn(async function updateConversation(nextPayload) {
        Object.assign(this, nextPayload);
        return this;
      }),
    })),
  },
  ChannelUser: {
    findOrCreate: jest.fn(async ({ where }) => [{ id: 'channel-user-1', ...where }, true]),
    findOne: jest.fn(),
  },
}));

jest.mock('../services/telegramService', () => ({
  mapInboundMessage: jest.fn(),
  sendMessage: jest.fn(async () => ({ ok: true, result: { message_id: 2 } })),
  answerCallbackQuery: jest.fn(async () => ({ ok: true })),
  setWebhook: jest.fn(async () => ({ ok: true, result: true })),
  deleteWebhook: jest.fn(async () => ({ ok: true, result: true })),
  getMe: jest.fn(async () => ({
    ok: true,
    result: {
      id: 12345,
      is_bot: true,
      first_name: 'VOXO Bot',
      username: 'voxo_bot',
    },
  })),
}));

jest.mock('../services/whatsappService', () => ({
  verifySignature: jest.fn(),
  mapInboundMessage: jest.fn(),
  testSession: jest.fn(),
  listWebhooks: jest.fn(),
  registerWebhook: jest.fn(),
  updateWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock('../services/openaiService', () => ({
  generateChatResponse: jest.fn(async () => ({
    response: 'Reponse test',
    model: 'gpt-test',
    tokensUsed: 12,
    sources: [],
  })),
}));

jest.mock('../services/quotaService', () => ({
  assertCanSendMessage: jest.fn(async () => undefined),
  incrementMessageUsage: jest.fn(async () => 1),
}));

jest.mock('../services/tenantFeatureFlags', () => ({
  computeTenantFeatures: jest.fn(async () => ({})),
}));

const express = require('express');
const request = require('supertest');
const webhookRoutes = require('./webhookRoutes');
const { Tenant, Conversation, ChannelUser } = require('../models');
const telegramService = require('../services/telegramService');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhookRoutes);
  return app;
}

describe('webhookRoutes Telegram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTenant = createTenant();
    Tenant.findByPk.mockImplementation(async () => mockTenant);
    Tenant.findOne.mockImplementation(async () => mockTenant);
    Conversation.findOne.mockResolvedValue(null);
    ChannelUser.findOrCreate.mockImplementation(
      async ({ where }) => [{ id: 'channel-user-1', ...where }, true]
    );
    telegramService.mapInboundMessage.mockReturnValue({
      status: 'accepted',
      message: {
        version: 1,
        channel: 'telegram',
        provider: 'telegram',
        direction: 'inbound',
        externalMessageId: '10',
        externalConversationId: 'chat-1',
        sender: {
          externalUserId: 'chat-1',
          displayName: 'Alice Doe',
          username: 'alice',
        },
        type: 'text',
        text: 'Bonjour',
        media: null,
        occurredAt: '2026-06-30T12:00:00.000Z',
        metadata: {},
      },
    });
  });

  it('returns sanitized channel status', async () => {
    const app = createApp();
    const response = await request(app).get('/api/webhooks/channels/tenant-1/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.telegram.botUsername).toBe('old_bot');
    expect(response.body.data.telegram.botToken).toBeUndefined();
    expect(response.body.data.telegram.botTokenConfigured).toBe(true);
    expect(response.body.data.whatsapp.provider).toBe('meta');
  });

  it('tests a Telegram bot and persists bot identity', async () => {
    mockTenant = createTenant({ telegram: { botToken: null, webhookActive: false } });

    const app = createApp();
    const response = await request(app)
      .post('/api/webhooks/telegram/tenant-1/test')
      .send({ botToken: 'token-2' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(telegramService.getMe).toHaveBeenCalledWith('token-2');
    expect(mockTenant.update).toHaveBeenCalled();
    expect(mockTenant.settings.channels.telegram.botToken).toBe('token-2');
    expect(mockTenant.settings.channels.telegram.botUsername).toBe('voxo_bot');
    expect(mockTenant.settings.channels.telegram.botFirstName).toBe('VOXO Bot');
  });

  it('registers a Telegram webhook and updates tenant settings', async () => {
    mockTenant = createTenant({ telegram: { botToken: null, webhookActive: false } });

    const app = createApp();
    const response = await request(app)
      .post('/api/webhooks/telegram/tenant-1/register')
      .send({ botToken: 'token-2' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(telegramService.getMe).toHaveBeenCalledWith('token-2');
    expect(telegramService.setWebhook).toHaveBeenCalledWith(
      'token-2',
      'http://localhost:3000/api/webhooks/telegram/tenant-1',
      expect.any(String)
    );
    expect(mockTenant.settings.channels.telegram.webhookActive).toBe(true);
    expect(mockTenant.settings.channels.telegram.botUsername).toBe('voxo_bot');
    expect(response.body.data.channel.botToken).toBeUndefined();
  });

  it('deletes a configured Telegram webhook', async () => {
    const app = createApp();
    const response = await request(app).delete('/api/webhooks/telegram/tenant-1/webhook');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(telegramService.deleteWebhook).toHaveBeenCalledWith('token-1');
    expect(mockTenant.settings.channels.telegram.webhookActive).toBe(false);
  });

  it('processes an inbound Telegram webhook with a valid secret', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/webhooks/telegram/tenant-1')
      .set('X-Telegram-Bot-Api-Secret-Token', 'secret-1')
      .send({ message: { text: 'Bonjour' } });

    expect(response.status).toBe(200);
    expect(Conversation.create).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'telegram',
      externalUserId: 'chat-1',
      userId: 'alice',
    }));
    expect(ChannelUser.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'chat-1',
      },
    }));
    expect(ChannelUser.findOrCreate.mock.invocationCallOrder[0])
      .toBeLessThan(Conversation.findOne.mock.invocationCallOrder[0]);
    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      'token-1',
      'chat-1',
      'Reponse test',
      expect.objectContaining({
        suggestions: [],
        removeKeyboard: true,
        tenantId: 'tenant-1',
        messageId: '10',
      })
    );
  });

  it('acknowledges an unknown tenant without processing the inbound webhook', async () => {
    Tenant.findOne.mockResolvedValueOnce(null);

    const response = await request(createApp())
      .post('/api/webhooks/telegram/missing')
      .send({ message: { text: 'Bonjour' } });

    expect(response.status).toBe(200);
    expect(response.text).toBe('Tenant not found');
    expect(Conversation.findOne).not.toHaveBeenCalled();
    expect(ChannelUser.findOrCreate).not.toHaveBeenCalled();
  });

  it('refuses management of another tenant channels', async () => {
    mockTenant = createTenant();
    mockTenant.id = 'tenant-2';
    Tenant.findOne.mockResolvedValue(mockTenant);

    const response = await request(createApp())
      .post('/api/webhooks/telegram/tenant-2/register')
      .send({ botToken: 'token-2' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TENANT_ACCESS_DENIED');
    expect(telegramService.getMe).not.toHaveBeenCalled();
  });
});
