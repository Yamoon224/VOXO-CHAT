const jwt = require('jsonwebtoken');
const axios = require('axios');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_TTL_SECONDS = 3300; // Google délivre 1 h ; on renouvelle avant.

// FCM HTTP v1. `account` = compte de service Google (project_id, client_email, private_key).
function createFcmProvider({ http = axios, now = () => Date.now() } = {}) {
  const cache = new Map();

  async function accessToken(account) {
    const cached = cache.get(account.client_email);
    if (cached && cached.expiresAt > now()) return cached.token;
    const iat = Math.floor(now() / 1000);
    const assertion = jwt.sign(
      { iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 },
      account.private_key, { algorithm: 'RS256' },
    );
    const { data } = await http.post(TOKEN_URL, new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion,
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 });
    cache.set(account.client_email, { token: data.access_token, expiresAt: now() + TOKEN_TTL_SECONDS * 1000 });
    return data.access_token;
  }

  function isUnregistered(error) {
    const details = error.response?.data?.error?.details || [];
    return error.response?.status === 404 || details.some(item => item.errorCode === 'UNREGISTERED');
  }

  /** @returns {Promise<{ ok: boolean, invalid?: boolean, error?: string }>} */
  async function send(account, { token, title, body, data }) {
    try {
      const bearer = await accessToken(account);
      await http.post(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
        message: { token, notification: { title, body }, data, android: { priority: 'HIGH' } },
      }, { headers: { Authorization: `Bearer ${bearer}` }, timeout: 10000 });
      return { ok: true };
    } catch (error) {
      return { ok: false, invalid: isUnregistered(error), error: error.response?.data?.error?.status || error.message };
    }
  }

  return { send };
}

module.exports = { createFcmProvider };
