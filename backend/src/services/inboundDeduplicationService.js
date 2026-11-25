const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

const memoryClaims = new Map();
const ttlSeconds = 24 * 60 * 60;
const maxMemoryClaims = 5000;

function buildKey({ tenantId, channel, externalMessageId }) {
  const value = `${tenantId}:${channel}:${externalMessageId}`;
  const digest = crypto.createHash('sha256').update(value).digest('hex');
  return `inbound-message:${digest}`;
}

function pruneMemory(now = Date.now()) {
  for (const [key, expiresAt] of memoryClaims) {
    if (expiresAt <= now) memoryClaims.delete(key);
  }
  while (memoryClaims.size >= maxMemoryClaims) {
    memoryClaims.delete(memoryClaims.keys().next().value);
  }
}

async function claim(context) {
  const key = buildKey(context);
  const redis = getRedisClient();
  if (redis?.status === 'ready') {
    try {
      return (await redis.set(key, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
    } catch {
      // Le verrou mémoire prend le relais si Redis est momentanément indisponible.
    }
  }

  const now = Date.now();
  pruneMemory(now);
  if (memoryClaims.has(key)) return false;
  memoryClaims.set(key, now + ttlSeconds * 1000);
  return true;
}

async function release(context) {
  const key = buildKey(context);
  memoryClaims.delete(key);
  const redis = getRedisClient();
  if (redis?.status === 'ready') {
    try {
      await redis.del(key);
    } catch {
      // Une erreur de nettoyage Redis ne doit pas masquer l’erreur d’origine.
    }
  }
}

function resetMemory() {
  memoryClaims.clear();
}

module.exports = {
  buildKey,
  claim,
  release,
  resetMemory,
};
