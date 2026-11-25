const crypto = require('crypto');
const { AppError } = require('../middleware/errorMiddleware');
const cryptoService = require('./integrationCryptoService');
const { normalizeAppId } = require('../../../shared/allowed-apps');

// Réglages des notifications push mobiles du propriétaire. Les identifiants d'envoi (compte de
// service FCM, clé APNs) sont à lui, pas à VOXO : chiffrés au repos, jamais renvoyés par l'API.
const TEN_CHARS = /^[A-Z0-9]{10}$/;

function invalid(message) { return new AppError(message, 400, { code: 'INVALID_PUSH_SETTINGS' }); }

function parsePrivateKey(pem, label) {
  try { crypto.createPrivateKey(pem); } catch { throw invalid(`${label} : clé privée illisible.`); }
  return pem;
}

function parseServiceAccount(input) {
  let account = input;
  if (typeof input === 'string') {
    try { account = JSON.parse(input); } catch { throw invalid('Compte de service FCM : JSON invalide.'); }
  }
  const required = ['project_id', 'client_email', 'private_key'];
  if (!account || account.type !== 'service_account' || required.some(key => typeof account[key] !== 'string' || !account[key])) {
    throw invalid('Compte de service FCM : fichier JSON de compte de service Firebase attendu.');
  }
  parsePrivateKey(account.private_key, 'Compte de service FCM');
  return { type: 'service_account', project_id: account.project_id, client_email: account.client_email, private_key: account.private_key };
}

function parseApns(input, current) {
  const keyId = String(input.keyId ?? current.keyId ?? '').trim();
  const teamId = String(input.teamId ?? current.teamId ?? '').trim();
  const bundleId = normalizeAppId(String(input.bundleId ?? current.bundleId ?? ''));
  if (!TEN_CHARS.test(keyId)) throw invalid('APNs : l’identifiant de clé (Key ID) compte 10 caractères.');
  if (!TEN_CHARS.test(teamId)) throw invalid('APNs : l’identifiant d’équipe (Team ID) compte 10 caractères.');
  if (!bundleId) throw invalid('APNs : identifiant d’application (Bundle ID) invalide.');
  return { keyId, teamId, bundleId, sandbox: input.sandbox === undefined ? current.sandbox === true : input.sandbox === true };
}

/** État public : jamais de secret, seulement ce qui est configuré. */
function getStatus(tenant) {
  const config = tenant.mobilePush || {};
  return {
    enabled: config.enabled === true,
    includeMessageText: config.includeMessageText !== false,
    fcm: { configured: config.fcmConfigured === true },
    apns: { configured: config.apnsConfigured === true, ...(config.apns || {}) },
  };
}

async function update(tenant, body = {}) {
  const config = { ...(tenant.mobilePush || {}) };
  const secrets = cryptoService.decrypt(tenant.mobilePushSecrets);

  if (body.fcm?.remove) { delete secrets.fcm; config.fcmConfigured = false; }
  else if (body.fcm?.serviceAccount !== undefined) {
    secrets.fcm = { serviceAccount: parseServiceAccount(body.fcm.serviceAccount) };
    config.fcmConfigured = true;
  }

  if (body.apns?.remove) { delete secrets.apns; delete config.apns; config.apnsConfigured = false; }
  else if (body.apns) {
    const privateKey = body.apns.privateKey !== undefined ? parsePrivateKey(String(body.apns.privateKey), 'APNs') : secrets.apns?.privateKey;
    if (!privateKey) throw invalid('APNs : la clé privée (.p8) est requise.');
    config.apns = parseApns(body.apns, config.apns || {});
    secrets.apns = { privateKey };
    config.apnsConfigured = true;
  }

  if (body.includeMessageText !== undefined) config.includeMessageText = body.includeMessageText === true;
  const anyPlatform = config.fcmConfigured === true || config.apnsConfigured === true;
  if (body.enabled !== undefined) config.enabled = body.enabled === true && anyPlatform;
  else if (!anyPlatform) config.enabled = false;

  // `encrypt` renvoie null pour un objet vide : retirer le dernier secret efface bien la colonne.
  await tenant.update({ mobilePush: config, mobilePushSecrets: cryptoService.encrypt(secrets) });
  return getStatus(tenant);
}

module.exports = { getStatus, update };
