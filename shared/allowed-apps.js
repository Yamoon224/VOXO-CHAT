// Identifiants d'application autorisés pour le mobile — pendant de allowed-domains.js.
// Voir mobile/CONTRACT.md, « Identifiant d'application ». Aucune API Node : ce module est
// aussi importé par le dashboard.

const MAX_APP_IDS = 50
// Bundle identifier iOS (com.exemple.app) ou package name Android (fr.exemple.ios).
const APP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/

function normalizeAppId(input) {
  if (typeof input !== 'string') return null
  const value = input.trim()
  return APP_ID_PATTERN.test(value) ? value : null
}

/** Insensible à la casse : iOS traite les bundle identifiers sans tenir compte de la casse. */
function matchesAllowedApps(appId, appIds = []) {
  const normalized = normalizeAppId(appId)
  if (!normalized) return false
  const wanted = normalized.toLowerCase()
  return appIds.some(entry => typeof entry === 'string' && entry.toLowerCase() === wanted)
}

function validateAppIdList(list) {
  if (!Array.isArray(list)) return { value: null, error: 'La liste des applications est invalide.' }
  const value = []
  for (const entry of list) {
    const normalized = normalizeAppId(entry)
    if (!normalized) return { value: null, error: `Identifiant d’application invalide : ${entry}` }
    if (!value.some(item => item.toLowerCase() === normalized.toLowerCase())) value.push(normalized)
  }
  if (value.length > MAX_APP_IDS) return { value: null, error: `Au plus ${MAX_APP_IDS} applications.` }
  return { value, error: null }
}

module.exports = { MAX_APP_IDS, APP_ID_PATTERN, normalizeAppId, matchesAllowedApps, validateAppIdList }
