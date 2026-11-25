const { v4: uuidv4 } = require('uuid');
const whatsappService = require('../services/whatsappService');
const channelSettingsService = require('../services/channelSettingsService');
const { logChannelEvent } = require('../utils/channelLogger');

function currentSettings(tenant) { return tenant.settings?.channels?.whatsapp || {}; }
function errorMessage(error) { return error.response?.data?.error?.message || error.message || 'Impossible de joindre Meta'; }

async function testWhatsAppConnection(req, res) {
  const { phoneNumberId, accessToken } = req.body;
  const tenant = req.tenant;
  const current = currentSettings(tenant);
  const phoneId = phoneNumberId || current.phoneNumberId;
  const token = accessToken || current.accessToken;
  if (!phoneId || !token) return res.status(400).json({ success: false, error: 'Le Phone Number ID et le jeton d’accès Meta sont requis' });
  try {
    const phoneNumber = await whatsappService.getPhoneNumber(phoneId, token);
    const channel = await channelSettingsService.updateChannelSettings(tenant, 'whatsapp', {
      provider: 'meta', phoneNumberId: phoneId, accessToken: token, displayPhoneNumber: phoneNumber.display_phone_number || null,
      verifiedName: phoneNumber.verified_name || null, qualityRating: phoneNumber.quality_rating || null, lastError: null, lastTestedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true, message: 'Connexion Meta vérifiée', data: { phoneNumber, channel: channelSettingsService.sanitizeChannelStatus({ whatsapp: channel }).whatsapp } });
  } catch (error) {
    await channelSettingsService.updateChannelSettings(tenant, 'whatsapp', { provider: 'meta', phoneNumberId: phoneId || null, lastError: errorMessage(error), updatedAt: new Date().toISOString() });
    return res.status(400).json({ success: false, error: errorMessage(error) });
  }
}

async function registerWhatsAppWebhook(req, res) {
  const { phoneNumberId, accessToken, appSecret } = req.body;
  const tenant = req.tenant;
  const current = currentSettings(tenant);
  const phoneId = phoneNumberId || current.phoneNumberId;
  const token = accessToken || current.accessToken;
  const secret = appSecret || current.appSecret;
  if (!phoneId || !token || !secret) return res.status(400).json({ success: false, error: 'Le Phone Number ID, le jeton d’accès et l’App Secret Meta sont requis' });
  try {
    const phoneNumber = await whatsappService.getPhoneNumber(phoneId, token);
    const verifyToken = current.verifyToken || uuidv4();
    const webhookUrl = channelSettingsService.getWebhookUrl(req, 'whatsapp', req.params.tenantId);
    const channel = await channelSettingsService.updateChannelSettings(tenant, 'whatsapp', {
      provider: 'meta', phoneNumberId: phoneId, accessToken: token, appSecret: secret, verifyToken, webhookActive: true,
      displayPhoneNumber: phoneNumber.display_phone_number || null, verifiedName: phoneNumber.verified_name || null, qualityRating: phoneNumber.quality_rating || null, lastError: null, updatedAt: new Date().toISOString(),
    });
    logChannelEvent('info', 'channel.registered', { channel: 'whatsapp', provider: 'meta', tenantId: tenant.id, phoneNumberId: phoneId, status: 'registered' });
    return res.json({ success: true, message: 'Configuration Meta enregistrée', data: { channel: channelSettingsService.sanitizeChannelStatus({ whatsapp: channel }).whatsapp }, webhookUrl, verifyToken });
  } catch (error) {
    return res.status(400).json({ success: false, error: errorMessage(error) });
  }
}

async function deleteWhatsAppWebhook(req, res) {
  const channel = await channelSettingsService.updateChannelSettings(req.tenant, 'whatsapp', { webhookActive: false, lastError: null, updatedAt: new Date().toISOString() });
  return res.json({ success: true, message: 'Canal WhatsApp désactivé', data: { channel: channelSettingsService.sanitizeChannelStatus({ whatsapp: channel }).whatsapp } });
}

module.exports = { deleteWhatsAppWebhook, registerWhatsAppWebhook, testWhatsAppConnection };
