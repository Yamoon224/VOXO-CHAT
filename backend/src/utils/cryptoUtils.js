// Chiffrement au repos des secrets d'actions agent (clés d'API métier des
// tenants). AES-256-GCM : authentifié, donc toute altération du texte chiffré
// fait échouer le déchiffrement plutôt que de renvoyer un secret corrompu.
const crypto = require('crypto');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function resolveKey() {
  const raw = config.agentAction?.encryptionKey;
  if (!raw) {
    throw new AppError(
      "Le chiffrement des actions agent n'est pas configuré (AGENT_ACTION_ENCRYPTION_KEY manquante).",
      500,
      { code: 'AGENT_ACTION_ENCRYPTION_NOT_CONFIGURED' }
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new AppError(
      'AGENT_ACTION_ENCRYPTION_KEY doit être une clé hexadécimale de 32 octets (64 caractères).',
      500,
      { code: 'AGENT_ACTION_ENCRYPTION_INVALID_KEY' }
    );
  }
  return key;
}

/** Sortie : `iv:authTag:ciphertext`, tout en base64, un seul champ TEXT en base. */
function encrypt(plainText) {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map(part => part.toString('base64')).join(':');
}

function decrypt(payload) {
  const key = resolveKey();
  const [ivB64, authTagB64, ciphertextB64] = String(payload).split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new AppError('Secret chiffré invalide.', 500, { code: 'AGENT_ACTION_SECRET_CORRUPTED' });
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
