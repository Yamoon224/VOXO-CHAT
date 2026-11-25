// backend/src/services/storageService.js
// Stockage des fichiers uploadés sur Supabase Storage (bucket privé).
// L'isolation multi-tenant est portée par le préfixe de clé : toute clé
// commence par le tenantId, et readKey() refuse d'accéder à une clé d'un
// autre tenant même si son identifiant fuite.
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

let client = null;
let availability = { available: false, reason: 'not_checked' };

function isConfigured() {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

function getClient() {
  if (!isConfigured()) {
    throw new AppError(
      "Le stockage de fichiers n'est pas configuré sur ce serveur.",
      503,
      { code: 'STORAGE_NOT_CONFIGURED' }
    );
  }
  if (!client) {
    // La clé service_role contourne les RLS : ce client ne doit jamais être
    // exposé au navigateur, il reste confiné à ce service.
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

function bucket() {
  return getClient().storage.from(config.storage.bucket);
}

async function checkAvailability() {
  if (!isConfigured()) {
    availability = { available: false, reason: 'not_configured' };
    return availability;
  }
  try {
    const { data, error } = await getClient().storage.listBuckets();
    if (error) throw error;
    const configuredBucket = (data || []).find(item => item.name === config.storage.bucket);
    availability = configuredBucket
      ? { available: true, isPublic: Boolean(configuredBucket.public) }
      : { available: false, reason: 'bucket_missing' };
    return availability;
  } catch (error) {
    availability = { available: false, reason: 'storage_unreachable' };
    return availability;
  }
}

function getAvailabilityStatus() {
  return { ...availability };
}

function wrap(error, fallbackMessage) {
  console.error(JSON.stringify({
    event: 'storage_operation_failed',
    code: error?.code || 'STORAGE_PROVIDER_ERROR',
    statusCode: error?.statusCode || error?.status || 502,
  }));
  return new AppError(fallbackMessage, 502, { code: 'STORAGE_ERROR' });
}

function isMissingObjectError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'object_not_found' || code === 'nosuchkey' || message.includes('object not found');
}

/** Garantit qu'une clé appartient bien au tenant avant toute opération. */
function assertOwnedBy(key, tenantId) {
  if (!key || !tenantId || !String(key).startsWith(`${tenantId}/`)) {
    throw new AppError('Fichier introuvable.', 404, { code: 'FILE_NOT_FOUND' });
  }
}

/**
 * Envoie un buffer et retourne sa clé de stockage.
 * @param {string} scope 'knowledge' | 'conversations'
 */
async function upload(tenantId, scope, buffer, { filename, mimeType, extension }) {
  const suffix = extension || (filename ? filename.slice(filename.lastIndexOf('.')) : '');
  const key = `${tenantId}/${scope}/${uuidv4()}${suffix}`;

  const { error } = await bucket().upload(key, buffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false
  });

  if (error) throw wrap(error, "Le fichier n'a pas pu être enregistré.");
  return key;
}

/** URL signée de courte durée, seule voie de lecture côté client. */
async function createSignedUrl(key, tenantId, expiresIn = config.storage.signedUrlTtl) {
  assertOwnedBy(key, tenantId);
  const { data, error } = await bucket().createSignedUrl(key, expiresIn);
  if (error && isMissingObjectError(error)) {
    throw new AppError("Ce fichier n'est plus disponible.", 404, { code: 'FILE_NOT_FOUND' });
  }
  if (error) throw wrap(error, "Le lien de téléchargement n'a pas pu être généré.");
  return data.signedUrl;
}

/** Relit un fichier en mémoire (retraitement d'un document déjà importé). */
async function download(key, tenantId) {
  assertOwnedBy(key, tenantId);
  const { data, error } = await bucket().download(key);
  if (error) throw wrap(error, "Le fichier d'origine est introuvable.");
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Suppression best-effort : un échec ne doit jamais faire échouer la
 * suppression métier qui l'a déclenchée, il laisse seulement un orphelin.
 */
async function remove(keys, tenantId) {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  const owned = list.filter(key => String(key).startsWith(`${tenantId}/`));
  if (owned.length === 0) return 0;

  try {
    const { error } = await bucket().remove(owned);
    if (error) throw error;
    return owned.length;
  } catch (error) {
    console.error('⚠️ Storage: suppression échouée', {
      fileCount: owned.length,
      error: error?.message
    });
    return 0;
  }
}

/** Purge tout le contenu d'un tenant (purge de compte à 30 jours). */
async function removeTenantPrefix(tenantId) {
  if (!isConfigured() || !tenantId) return 0;
  let removed = 0;

  for (const scope of ['knowledge', 'conversations', 'branding', 'profiles']) {
    try {
      const { data, error } = await bucket().list(`${tenantId}/${scope}`, { limit: 1000 });
      if (error) throw error;
      const keys = (data || []).map(entry => `${tenantId}/${scope}/${entry.name}`);
      if (keys.length > 0) removed += await remove(keys, tenantId);
    } catch (error) {
      console.error('⚠️ Storage: purge partielle', { tenantId, scope, error: error?.message });
    }
  }

  return removed;
}

module.exports = {
  isConfigured,
  checkAvailability,
  getAvailabilityStatus,
  upload,
  createSignedUrl,
  download,
  remove,
  removeTenantPrefix,
  assertOwnedBy
};
