const telegramService = require('../services/telegramService');
const telegramMediaService = require('../services/telegramMediaService');
const inboundMessageService = require('../services/inboundMessageService');
const { logChannelEvent } = require('../utils/channelLogger');

function logIgnored(tenantId, result) {
  logChannelEvent('info', 'webhook.ignored', {
    channel: 'telegram',
    provider: 'telegram',
    tenantId,
    status: 'ignored',
    reason: result.reason,
  });
}

async function handleTelegramWebhook(req, res) {
  const startedAt = Date.now();
  const { tenantId } = req.params;

  try {
    const tenant = req.tenant;

    const settings = tenant.settings?.channels?.telegram;
    if (!settings?.botToken) {
      return res.status(200).send('Telegram not configured');
    }

    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (settings.webhookSecret && secret !== settings.webhookSecret) {
      logChannelEvent('warn', 'webhook.signature_invalid', {
        channel: 'telegram',
        provider: 'telegram',
        tenantId,
        status: 'invalid_secret',
      });
      return res.status(200).send('Invalid secret');
    }

    logChannelEvent('info', 'webhook.received', {
      channel: 'telegram',
      provider: 'telegram',
      tenantId,
      status: 'accepted',
    });
    res.status(200).send('OK');

    if (req.body?.callback_query?.id) {
      try {
        await telegramService.answerCallbackQuery(settings.botToken, req.body.callback_query.id);
      } catch (error) {
        logChannelEvent('warn', 'telegram.callback_ack_failed', {
          channel: 'telegram', provider: 'telegram', tenantId, error,
        });
      }
    }

    const mapped = telegramService.mapInboundMessage(req.body);
    if (mapped.status === 'ignored') {
      logIgnored(tenantId, mapped);
      return undefined;
    }

    const result = await inboundMessageService.processInboundMessage({
      tenant,
      message: mapped.message,
      // `options` porte le clavier de suggestions, le contexte porte la traçabilité :
      // sendMessage reçoit les deux fusionnés. chatId est réinjecté côté service.
      sendReply: (text, options = {}) => telegramService.sendMessage(
        settings.botToken,
        mapped.message.externalConversationId,
        text,
        { ...options, tenantId, messageId: mapped.message.externalMessageId }
      ),
      loadMedia: (message) => telegramMediaService.loadMedia(settings.botToken, message),
    });

    if (result.status === 'ignored') {
      logIgnored(tenantId, result);
    }
    return undefined;
  } catch (error) {
    logChannelEvent('error', 'webhook.processing_failed', {
      channel: 'telegram',
      provider: 'telegram',
      tenantId,
      status: 'error',
      durationMs: Date.now() - startedAt,
      error,
    });
    return undefined;
  }
}

module.exports = {
  handleTelegramWebhook,
};
