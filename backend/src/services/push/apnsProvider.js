const http2 = require('http2');
const jwt = require('jsonwebtoken');

const INVALID_REASONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic']);
const JWT_TTL_MS = 50 * 60 * 1000; // Apple refuse un jeton de plus d'1 h, et trop de renouvellements.

// APNs, authentification par jeton (clé .p8). `credentials` = { keyId, teamId, bundleId, privateKey, sandbox }.
function createApnsProvider({ connect = http2.connect, now = () => Date.now() } = {}) {
  const cache = new Map();

  function providerToken({ keyId, teamId, privateKey }) {
    const cached = cache.get(keyId);
    if (cached && cached.expiresAt > now()) return cached.token;
    const token = jwt.sign({ iss: teamId, iat: Math.floor(now() / 1000) }, privateKey, { algorithm: 'ES256', header: { kid: keyId } });
    cache.set(keyId, { token, expiresAt: now() + JWT_TTL_MS });
    return token;
  }

  /** @returns {Promise<{ ok: boolean, invalid?: boolean, error?: string }>} */
  function send(credentials, { token, title, body, data }) {
    return new Promise(resolve => {
      let bearer;
      try { bearer = providerToken(credentials); } catch (error) { return resolve({ ok: false, error: error.message }); }
      const host = credentials.sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
      const client = connect(host);
      const done = result => { client.close(); resolve(result); };
      client.on('error', error => done({ ok: false, error: error.message }));

      const request = client.request({
        ':method': 'POST', ':path': `/3/device/${encodeURIComponent(token)}`,
        authorization: `bearer ${bearer}`, 'apns-topic': credentials.bundleId,
        'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json',
      });
      let status = 0;
      let payload = '';
      request.setEncoding('utf8');
      request.on('response', headers => { status = headers[':status']; });
      request.on('data', chunk => { payload += chunk; });
      request.on('error', error => done({ ok: false, error: error.message }));
      request.on('end', () => {
        if (status === 200) return done({ ok: true });
        let reason = '';
        try { reason = JSON.parse(payload).reason || ''; } catch { /* corps vide */ }
        done({ ok: false, invalid: status === 410 || INVALID_REASONS.has(reason), error: reason || `HTTP ${status}` });
      });
      request.setTimeout(10000, () => { request.close(); done({ ok: false, error: 'timeout' }); });
      request.end(JSON.stringify({ aps: { alert: { title, body }, sound: 'default', 'thread-id': data.sessionId }, voxo: data }));
    });
  }

  return { send };
}

module.exports = { createApnsProvider };
