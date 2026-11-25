const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorMiddleware');
const telegramService = require('../services/telegramService');
const channelSettingsService = require('../services/channelSettingsService');
const { logChannelEvent } = require('../utils/channelLogger');

function extractBotInfo(botInfo = {}) {
  return botInfo.result || botInfo;
}

function getTelegramErrorMessage(error, fallback) {
  const status = error.response?.status;

  if (status === 401) return 'Le token Telegram est invalide';
  if (status === 403) return 'Telegram refuse l acces a ce bot';
  if (status === 429) return 'Telegram limite temporairement les requetes';
  if (status >= 500) return 'Le service Telegram est temporairement indisponible';
  if (!error.response && error.code) return 'Le service Telegram est injoignable';
  return fallback;
}

function toTelegramAppError(error, fallback) {
  if (error instanceof AppError) return error;

  const statusCode = error.response?.status === 429 || error.response?.status >= 500
    ? 503
    : 400;
  return new AppError(getTelegramErrorMessage(error, fallback), statusCode, {
    code: 'TELEGRAM_API_ERROR',
  });
}

async function registerTelegramWebhook(req, res, next) {
  try {
    const { tenantId } = req.params;
    const { botToken, webhookUrl, secretToken } = req.body;
    const tenant = req.tenant;

    const currentSettings = tenant.settings?.channels?.telegram || {};
    const token = botToken || currentSettings.botToken;
    const secret = secretToken || currentSettings.webhookSecret || uuidv4();
    const url = webhookUrl
      || channelSettingsService.getWebhookUrl(req, 'telegram', tenantId);
    if (!token) return next(new AppError('Le token du bot Telegram est requis', 400, { code: 'TELEGRAM_TOKEN_REQUIRED' }));

    const botInfo = await telegramService.getMe(token);
    const bot = extractBotInfo(botInfo);
    const webhook = await telegramService.setWebhook(token, url, secret);
    const channel = await channelSettingsService.updateChannelSettings(tenant, 'telegram', {
      botToken: token,
      botId: bot.id || null,
      botUsername: bot.username || null,
      botFirstName: bot.first_name || null,
      webhookActive: true,
      webhookSecret: secret,
      lastError: null,
      lastTestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Webhook Telegram enregistre avec succes',
      data: {
        webhook,
        botInfo: bot,
        channel: channelSettingsService.sanitizeChannelStatus({ telegram: channel }).telegram,
      },
      webhookUrl: url,
    });
  } catch (error) {
    return next(toTelegramAppError(error, 'Impossible d enregistrer le webhook Telegram'));
  }
}

async function testTelegramConnection(req, res) {
  const { tenantId } = req.params;
  const { botToken } = req.body;
  const tenant = req.tenant;

  try {
    const token = botToken || tenant.settings?.channels?.telegram?.botToken;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Le token du bot Telegram est requis',
      });
    }

    const botInfo = await telegramService.getMe(token);
    const bot = extractBotInfo(botInfo);
    await channelSettingsService.updateChannelSettings(tenant, 'telegram', {
      botToken: token,
      botId: bot.id || null,
      botUsername: bot.username || null,
      botFirstName: bot.first_name || null,
      lastError: null,
      lastTestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Connexion reussie', data: botInfo });
  } catch (error) {
    const message = getTelegramErrorMessage(error, 'Impossible de verifier le bot Telegram');
    if (tenant) {
      await channelSettingsService.updateChannelSettings(tenant, 'telegram', {
        botToken: botToken || tenant.settings?.channels?.telegram?.botToken || null,
        lastError: message,
        updatedAt: new Date().toISOString(),
      });
    }
    logChannelEvent('error', 'channel.test_failed', {
      channel: 'telegram',
      provider: 'telegram',
      tenantId,
      status: 'error',
      error,
    });
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

async function deleteTelegramWebhook(req, res, next) {
  try {
    const tenant = req.tenant;

    const token = tenant.settings?.channels?.telegram?.botToken;
    if (!token) return next(new AppError('Le bot Telegram n est pas configure', 400, { code: 'TELEGRAM_NOT_CONFIGURED' }));

    await telegramService.deleteWebhook(token);
    await channelSettingsService.updateChannelSettings(tenant, 'telegram', {
      webhookActive: false,
      lastError: null,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true, message: 'Webhook Telegram supprime avec succes' });
  } catch (error) {
    return next(toTelegramAppError(error, 'Impossible de supprimer le webhook Telegram'));
  }
}

module.exports = {
  deleteTelegramWebhook,
  registerTelegramWebhook,
  testTelegramConnection,
};
