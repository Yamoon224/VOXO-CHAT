const whatsappService = require('../services/whatsappService');
const whatsappMediaService = require('../services/whatsappMediaService');
const channelSettingsService = require('../services/channelSettingsService');
const inboundMessageService = require('../services/inboundMessageService');
const { logChannelEvent } = require('../utils/channelLogger');

function logIgnored(tenantId, result) { logChannelEvent('info', 'webhook.ignored', { channel: 'whatsapp', provider: 'meta', tenantId, status: 'ignored', reason: result.reason }); }

function verifyWhatsAppWebhook(req, res) {
  const challenge = whatsappService.verifyWebhookChallenge(req.query, req.tenant?.settings?.channels?.whatsapp?.verifyToken);
  return challenge ? res.status(200).send(challenge) : res.sendStatus(403);
}

async function handleWhatsAppWebhook(req, res) {
  const tenant = req.tenant;
  const settings = tenant?.settings?.channels?.whatsapp;
  if (!settings?.webhookActive || !settings.appSecret || !settings.accessToken) return res.status(200).send('WhatsApp not configured');
  if (!whatsappService.verifySignature(req.headers, req.rawBody, settings.appSecret)) return res.sendStatus(401);
  res.status(200).send('OK');
  try {
    const mapped = whatsappService.mapInboundMessage(req.body);
    if (mapped.status === 'ignored') return logIgnored(tenant.id, mapped);
    if (mapped.message.metadata.phoneNumberId !== settings.phoneNumberId) return logIgnored(tenant.id, { reason: 'phone_number_mismatch' });
    await channelSettingsService.updateChannelSettings(tenant, 'whatsapp', { lastWebhookAt: new Date().toISOString(), lastError: null, updatedAt: new Date().toISOString() });
    const result = await inboundMessageService.processInboundMessage({
      tenant, message: mapped.message,
      sendReply: (text) => whatsappService.sendMessage(settings.phoneNumberId, settings.accessToken, mapped.message.externalConversationId, text),
      loadMedia: (message) => whatsappMediaService.loadMedia(message, settings.accessToken),
    });
    if (result.status === 'ignored') logIgnored(tenant.id, result);
  } catch (error) {
    logChannelEvent('error', 'webhook.processing_failed', { channel: 'whatsapp', provider: 'meta', tenantId: tenant.id, status: 'error', error });
    await channelSettingsService.updateChannelSettings(tenant, 'whatsapp', { lastError: error.message, updatedAt: new Date().toISOString() });
  }
  return undefined;
}

module.exports = { handleWhatsAppWebhook, verifyWhatsAppWebhook };
