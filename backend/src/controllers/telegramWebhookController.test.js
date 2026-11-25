jest.mock('../services/telegramService', () => ({
  mapInboundMessage: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock('../services/inboundMessageService', () => ({
  processInboundMessage: jest.fn(),
}));

jest.mock('../utils/channelLogger', () => ({
  logChannelEvent: jest.fn(),
}));

const telegramService = require('../services/telegramService');
const inboundMessageService = require('../services/inboundMessageService');
const { logChannelEvent } = require('../utils/channelLogger');
const { handleTelegramWebhook } = require('./telegramWebhookController');

function request(secret = 'secret-1') {
  return {
    params: { tenantId: 'tenant-1' },
    headers: { 'x-telegram-bot-api-secret-token': secret },
    body: { message: { text: 'Bonjour' } },
    tenant: {
      settings: {
        channels: {
          telegram: {
            botToken: 'token-1',
            webhookSecret: 'secret-1',
          },
        },
      },
    },
  };
}

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

describe('telegramWebhookController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acknowledges an invalid secret without processing', async () => {
    const req = request('invalid-secret');
    const res = response();

    await handleTelegramWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Invalid secret');
    expect(telegramService.mapInboundMessage).not.toHaveBeenCalled();
    expect(inboundMessageService.processInboundMessage).not.toHaveBeenCalled();
  });

  it('logs a processing failure after the webhook was acknowledged', async () => {
    const req = request();
    const res = response();
    telegramService.mapInboundMessage.mockReturnValue({
      status: 'accepted',
      message: {
        externalConversationId: 'chat-1',
        externalMessageId: 'message-1',
      },
    });
    inboundMessageService.processInboundMessage.mockRejectedValue(
      new Error('Telegram unavailable')
    );

    await handleTelegramWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    expect(logChannelEvent).toHaveBeenCalledWith(
      'error',
      'webhook.processing_failed',
      expect.objectContaining({ channel: 'telegram', status: 'error' })
    );
  });
});
