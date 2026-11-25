const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/config');
const { IntegrationConnector } = require('../models');
const { encrypt } = require('./integrationCryptoService');
const { AppError } = require('../middleware/errorMiddleware');

function settings() {
  const microsoft = config.integrations.microsoft;
  if (!microsoft.clientId || !microsoft.clientSecret || !microsoft.redirectUri) throw new AppError('La connexion Microsoft 365 n’est pas configurée', 503, { code: 'MICROSOFT_NOT_CONFIGURED' });
  return microsoft;
}

async function start(tenantId, drives = [], syncFrequency = 'daily') {
  const microsoft = settings(); const state = crypto.randomBytes(24).toString('hex');
  const configValue = { drives, oauthState: state };
  const existing = await IntegrationConnector.findOne({ where: { tenantId, provider: 'microsoft365' } });
  const connector = existing ? await existing.update({ config: configValue, syncFrequency, status: 'disconnected' }) : await IntegrationConnector.create({ tenantId, provider: 'microsoft365', config: configValue, syncFrequency });
  const url = new URL(`https://login.microsoftonline.com/${microsoft.tenantId}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({ client_id: microsoft.clientId, response_type: 'code', redirect_uri: microsoft.redirectUri, response_mode: 'query', scope: 'offline_access Files.Read.All Sites.Read.All', state }).toString();
  return { connectorId: connector.id, authorizeUrl: url.toString() };
}

async function complete(code, state) {
  const connector = await IntegrationConnector.findOne({ where: { provider: 'microsoft365', config: { oauthState: state } } });
  if (!connector) throw new AppError('La demande de connexion Microsoft est invalide ou expirée', 400, { code: 'INVALID_MICROSOFT_STATE' });
  const microsoft = settings();
  try {
    const body = new URLSearchParams({ client_id: microsoft.clientId, client_secret: microsoft.clientSecret, code, redirect_uri: microsoft.redirectUri, grant_type: 'authorization_code' });
    const response = await axios.post(`https://login.microsoftonline.com/${microsoft.tenantId}/oauth2/v2.0/token`, body, { timeout: 15000 });
    const connectorConfig = { ...connector.config };
    delete connectorConfig.oauthState;
    await connector.update({ config: connectorConfig, credentials: encrypt({ accessToken: response.data.access_token, refreshToken: response.data.refresh_token }), status: 'connected', lastError: null });
    return connector;
  } catch (error) { throw new AppError('La connexion Microsoft 365 a échoué', 502, { code: 'MICROSOFT_TOKEN_EXCHANGE_FAILED' }); }
}

module.exports = { start, complete };
