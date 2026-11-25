jest.mock('../services/telegramService', () => ({
  getMe: jest.fn(),
  setWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
}));

jest.mock('../services/channelSettingsService', () => ({
  getWebhookUrl: jest.fn(() => 'https://api.example.test/telegram/tenant-1'),
  sanitizeChannelStatus: jest.fn((channels) => channels),
  updateChannelSettings: jest.fn(async (tenant, channel, settings) => settings),
}));

jest.mock('../utils/channelLogger', () => ({
  logChannelEvent: jest.fn(),
}));

const telegramService = require('../services/telegramService');
const channelSettingsService = require('../services/channelSettingsService');
const {
  registerTelegramWebhook,
  testTelegramConnection,
} = require('./telegramChannelController');

function tenant() {
  return {
    id: 'tenant-1',
    settings: {
      channels: {
        telegram: {
          botToken: 'token-1',
          webhookSecret: 'secret-1',
        },
      },
    },
  };
}

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('telegramChannelController errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists and returns a French error for an invalid token', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401, data: { description: 'Unauthorized' } };
    telegramService.getMe.mockRejectedValue(error);
    const req = {
      params: { tenantId: 'tenant-1' },
      body: {},
      tenant: tenant(),
    };
    const res = response();

    await testTelegramConnection(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Le token Telegram est invalide',
    });
    expect(channelSettingsService.updateChannelSettings).toHaveBeenCalledWith(
      req.tenant,
      'telegram',
      expect.objectContaining({ lastError: 'Le token Telegram est invalide' })
    );
  });

  it('normalizes a Telegram server error during registration', async () => {
    const error = new Error('Bad gateway');
    error.response = { status: 502 };
    telegramService.getMe.mockRejectedValue(error);
    const next = jest.fn();

    await registerTelegramWebhook({
      params: { tenantId: 'tenant-1' },
      body: {},
      tenant: tenant(),
    }, response(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 503,
      code: 'TELEGRAM_API_ERROR',
      message: 'Le service Telegram est temporairement indisponible',
    }));
  });
});
