const DEFAULT_ENDPOINT = 'http://ip-api.com/json/{ip}?fields=status,country,countryCode,city,regionName,timezone&lang=fr';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const LOOKUP_TIMEOUT_MS = 1500;

const cache = new Map();

function isGeolocationEnabled() {
  return process.env.IP_GEOLOCATION_ENABLED !== 'false';
}

function normalizeIp(ip) {
  if (typeof ip !== 'string' || !ip.trim()) return null;
  const value = ip.trim().replace(/^::ffff:/i, '');
  return value === '::1' ? '127.0.0.1' : value;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === 'localhost') return true;
  if (/^(10|127)\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^(::|fc|fd|fe80)/i.test(ip)) return true;
  return false;
}

function readCache(ip) {
  const entry = cache.get(ip);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    cache.delete(ip);
    return undefined;
  }
  return entry.location;
}

function writeCache(ip, location) {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(ip, { location, storedAt: Date.now() });
}

function locationFromHeaders(headers = {}) {
  const country = headers['x-geo-country'] || headers['cf-ipcountry'] || null;
  const city = headers['x-geo-city'] || null;
  if (!country && !city) return null;
  if (country && country.toUpperCase() === 'XX') return null;
  return {
    country: headers['x-geo-country-name'] || null,
    countryCode: country ? country.toUpperCase() : null,
    city: city || null,
    region: headers['x-geo-region'] || null,
    timezone: headers['x-geo-timezone'] || null,
    source: 'header',
  };
}

async function fetchLocation(ip) {
  const endpoint = (process.env.IP_GEOLOCATION_URL || DEFAULT_ENDPOINT).replace('{ip}', encodeURIComponent(ip));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.status && payload.status !== 'success') return null;
    if (!payload?.country && !payload?.city) return null;
    return {
      country: payload.country || null,
      countryCode: payload.countryCode || null,
      city: payload.city || null,
      region: payload.regionName || null,
      timezone: payload.timezone || null,
      source: 'ip',
    };
  } catch (error) {
    console.warn('Géolocalisation IP indisponible:', error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveLocation(rawIp, headers = {}) {
  const fromHeaders = locationFromHeaders(headers);
  if (fromHeaders) return fromHeaders;
  if (!isGeolocationEnabled()) return null;
  const ip = normalizeIp(rawIp);
  if (isPrivateIp(ip)) return null;
  const cached = readCache(ip);
  if (cached !== undefined) return cached;
  const location = await fetchLocation(ip);
  writeCache(ip, location);
  return location;
}

async function buildClientContext(req) {
  const headers = req.headers || {};
  return {
    userAgent: req.get ? req.get('User-Agent') : headers['user-agent'] || null,
    ipAddress: req.ip || null,
    referrer: req.get ? req.get('Referer') : headers.referer || null,
    origin: req.get ? req.get('Origin') : headers.origin || null,
    acceptLanguage: headers['accept-language'] || null,
    location: await resolveLocation(req.ip, headers),
    timestamp: new Date().toISOString(),
  };
}

function clearCache() {
  cache.clear();
}

module.exports = { buildClientContext, resolveLocation, isPrivateIp, clearCache };
