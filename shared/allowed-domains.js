function normalizeDomain(input) {
  if (typeof input !== 'string' || !input.trim()) return null
  const value = input.trim().includes('://') ? input.trim() : `https://${input.trim()}`
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    if (url.hostname === 'localhost' || url.hostname.includes('*') || /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return null
    return url.origin
  } catch { return null }
}

function matchesAllowedDomains(origin, domains = []) {
  const normalizedOrigin = normalizeDomain(origin)
  if (!normalizedOrigin) return false
  const url = new URL(normalizedOrigin)
  return domains.some(entry => {
    if (typeof entry !== 'string') return false
    if (entry.startsWith('*.')) return url.protocol === 'https:' && url.hostname.endsWith(`.${entry.slice(2).toLowerCase()}`)
    return normalizeDomain(entry) === normalizedOrigin
  })
}

function validateDomainList(list) {
  if (!Array.isArray(list)) return { value: null, error: 'La liste des domaines est invalide.' }
  const value = []
  for (const entry of list) {
    if (typeof entry === 'string' && entry.startsWith('*.')) {
      const host = entry.slice(2).toLowerCase()
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return { value: null, error: `Domaine invalide : ${entry}` }
      value.push(`*.${host}`)
    } else {
      const normalized = normalizeDomain(entry)
      if (!normalized) return { value: null, error: `Domaine invalide : ${entry}` }
      value.push(normalized)
    }
  }
  return { value: [...new Set(value)], error: null }
}

module.exports = { normalizeDomain, matchesAllowedDomains, validateDomainList }
