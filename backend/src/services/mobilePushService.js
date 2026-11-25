const crypto = require('crypto');
const { Tenant, MobilePushDevice } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const cryptoService = require('./integrationCryptoService');
const visitorPresence = require('./visitorPresence');
const { createFcmProvider } = require('./push/fcmProvider');
const { createApnsProvider } = require('./push/apnsProvider');

const MAX_BODY_LENGTH = 140;
const MAX_TOKEN_LENGTH = 4096;
const GENERIC_BODY = { fr: 'Vous avez reçu une réponse.', en: 'You have a new reply.' };
const SESSION_ID = /^[A-Za-z0-9_-]{8,100}$/;

let providers = { fcm: createFcmProvider(), apns: createApnsProvider() };
function setProviders(next) { providers = { ...providers, ...next }; }

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

function settings(tenant) { return tenant.mobilePush || {}; }
function isEnabledFor(tenant, platform) {
  const config = settings(tenant);
  return config.enabled === true && (platform === 'fcm' ? config.fcmConfigured === true : config.apnsConfigured === true);
}

function invalidToken() { return new AppError('Jeton de notification invalide.', 400, { code: 'INVALID_PUSH_TOKEN' }); }

/** Lie un jeton à UNE session : le réenregistrer avec une autre session le déplace. */
async function registerDevice(tenant, { sessionId, token, platform, locale, appId }) {
  if (typeof token !== 'string' || !token.trim() || token.length > MAX_TOKEN_LENGTH || /\s/.test(token)) throw invalidToken();
  if (!['fcm', 'apns'].includes(platform) || typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) throw invalidToken();
  if (!isEnabledFor(tenant, platform)) {
    throw new AppError('Les notifications mobiles ne sont pas activées pour ce chatbot.', 403, { code: 'PUSH_NOT_ENABLED' });
  }
  const values = {
    tenantId: tenant.id, tokenHash: hashToken(token), token, sessionId, platform,
    locale: locale === 'en' ? 'en' : 'fr', appId: appId || null, lastSeenAt: new Date(),
  };
  const existing = await MobilePushDevice.findOne({ where: { tenantId: tenant.id, tokenHash: values.tokenHash } });
  if (existing) await existing.update(values); else await MobilePushDevice.create(values);
  return { registered: true };
}

async function unregisterDevice(tenant, token) {
  if (typeof token !== 'string' || !token.trim()) throw invalidToken();
  const removed = await MobilePushDevice.destroy({ where: { tenantId: tenant.id, tokenHash: hashToken(token) } });
  return { removed: removed > 0 };
}

function credentialsFor(tenant, platform) {
  const secrets = cryptoService.decrypt(tenant.mobilePushSecrets);
  if (platform === 'fcm') return secrets.fcm?.serviceAccount || null;
  const apns = settings(tenant).apns || {};
  return secrets.apns?.privateKey ? { ...apns, privateKey: secrets.apns.privateKey } : null;
}

function buildContent(tenant, device, { message, agentName }) {
  const config = settings(tenant);
  const locale = device.locale === 'en' ? 'en' : 'fr';
  const text = String(message?.content || '').trim();
  const includeText = config.includeMessageText !== false && text;
  return {
    title: agentName || tenant.settings?.chatbot?.name || 'Assistant',
    body: includeText ? text.slice(0, MAX_BODY_LENGTH) : GENERIC_BODY[locale],
    data: { type: 'voxo.agent_message', sessionId: device.sessionId, messageId: String(message?.id || '') },
  };
}

/**
 * Notifie les appareils d'une conversation quand un conseiller répond. Ne lève jamais : une panne
 * de push ne doit pas faire échouer l'envoi du message. N'envoie rien si le visiteur a un socket ouvert.
 */
async function notifyAgentMessage({ tenantId, sessionId, message, agentName }) {
  try {
    if (visitorPresence.has(tenantId, sessionId)) return { sent: 0 };
    const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'settings', 'mobilePush', 'mobilePushSecrets'] });
    if (!tenant || settings(tenant).enabled !== true) return { sent: 0 };
    const devices = await MobilePushDevice.findAll({ where: { tenantId, sessionId } });
    let sent = 0;
    for (const device of devices) {
      if (!isEnabledFor(tenant, device.platform)) continue;
      const credentials = credentialsFor(tenant, device.platform);
      if (!credentials) continue;
      const result = await providers[device.platform].send(credentials, { token: device.token, ...buildContent(tenant, device, { message, agentName }) });
      if (result.ok) sent += 1;
      else if (result.invalid) await device.destroy();
      else console.warn(JSON.stringify({ event: 'mobile_push_failed', tenantId, platform: device.platform, error: result.error }));
    }
    return { sent };
  } catch (error) {
    console.warn(JSON.stringify({ event: 'mobile_push_error', tenantId, error: error.message }));
    return { sent: 0 };
  }
}

module.exports = { registerDevice, unregisterDevice, notifyAgentMessage, isEnabledFor, setProviders, hashToken, MAX_BODY_LENGTH };
