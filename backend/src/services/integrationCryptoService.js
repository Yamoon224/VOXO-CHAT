const crypto = require('crypto');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

function key() {
  const value = config.integrations.encryptionKey;
  if (!value) throw new AppError('Le chiffrement des intégrations n’est pas configuré', 503, { code: 'INTEGRATION_ENCRYPTION_UNAVAILABLE' });
  return crypto.createHash('sha256').update(value).digest();
}

function encrypt(value) {
  if (!value || Object.keys(value).length === 0) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
}

function decrypt(value) {
  if (!value) return {};
  const payload = JSON.parse(value);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8'));
}

module.exports = { encrypt, decrypt };
