const { Tenant } = require('../models');
const config = require('../config/config');

function cloneSettings(settings = {}) {
  return JSON.parse(JSON.stringify(settings || {}));
}

async function findActiveTenant(tenantId) {
  return Tenant.findOne({
    where: { id: tenantId, isActive: true },
  });
}

async function updateChannelSettings(tenant, channel, patch = {}) {
  const settings = cloneSettings(tenant.settings);
  settings.channels = settings.channels || {};
  settings.channels[channel] = {
    ...(settings.channels[channel] || {}),
    ...patch,
  };

  await tenant.update({ settings });
  return settings.channels[channel];
}

function getBackendBaseUrl(req) {
  return config.app.backendUrl || `${req.protocol}://${req.get('host')}`;
}

function getWebhookUrl(req, channel, tenantId) {
  return `${getBackendBaseUrl(req)}/api/webhooks/${channel}/${tenantId}`;
}

function sanitizeChannelStatus(settings = {}) {
  const telegram = settings.telegram || {};
  const whatsapp = settings.whatsapp || {};

  return {
    telegram: {
      botTokenConfigured: Boolean(telegram.botToken),
      botUsername: telegram.botUsername || null,
      botFirstName: telegram.botFirstName || null,
      botId: telegram.botId || null,
      webhookActive: Boolean(telegram.webhookActive),
      lastTestedAt: telegram.lastTestedAt || null,
      lastError: telegram.lastError || null,
      updatedAt: telegram.updatedAt || null,
    },
    whatsapp: {
      provider: whatsapp.provider || 'meta',
      phoneNumberId: whatsapp.phoneNumberId || null,
      displayPhoneNumber: whatsapp.displayPhoneNumber || null,
      verifiedName: whatsapp.verifiedName || null,
      qualityRating: whatsapp.qualityRating || null,
      webhookActive: Boolean(whatsapp.webhookActive),
      lastTestedAt: whatsapp.lastTestedAt || null,
      lastWebhookAt: whatsapp.lastWebhookAt || null,
      lastError: whatsapp.lastError || null,
      updatedAt: whatsapp.updatedAt || null,
    },
  };
}

module.exports = {
  findActiveTenant,
  getWebhookUrl,
  sanitizeChannelStatus,
  updateChannelSettings,
};
