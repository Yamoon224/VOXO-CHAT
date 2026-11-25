const BROWSERS = [
  [/Edg[eA]?\/([\d.]+)/, 'Edge'],
  [/OPR\/([\d.]+)|Opera/, 'Opera'],
  [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
]

const SYSTEMS = [
  [/Windows NT 10|Windows NT 11/, 'Windows 10/11'],
  [/Windows NT/, 'Windows'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Android/, 'Android'],
  [/Linux/, 'Linux'],
]

// `null` = libellé traduit côté composant via `t('channelWebsite')` ; les noms
// de marque ne se traduisent pas et restent en dur.
const CHANNELS = { web: null, telegram: 'Telegram', whatsapp: 'WhatsApp' }

/**
 * `deviceKey` plutôt qu'un libellé : les noms de navigateur et de système sont
 * des marques et restent tels quels, mais « Ordinateur / Tablette / Mobile » se
 * traduit — le composant résout la clé contre `Conversations`.
 */
export function parseUserAgent(userAgent) {
  if (typeof userAgent !== 'string' || !userAgent.trim()) return { browser: null, os: null, deviceKey: null }
  const matched = BROWSERS.find(([pattern]) => pattern.test(userAgent))
  const version = matched ? (userAgent.match(matched[0])?.[1] || '').split('.')[0] : ''
  const browser = matched ? `${matched[1]}${version ? ` ${version}` : ''}` : null
  const os = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1] || null
  const deviceKey = /iPad|Tablet/i.test(userAgent)
    ? 'deviceTablet'
    : /Mobi|Android|iPhone/i.test(userAgent) ? 'deviceMobile' : 'deviceDesktop'
  return { browser, os, deviceKey }
}

function cityFromTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone.includes('/')) return null
  return timezone.split('/').pop().replace(/_/g, ' ')
}

export function formatLocation(metadata = {}) {
  const location = metadata?.location || null
  const city = location?.city || null
  const country = location?.country || location?.countryCode || null
  if (city && country) return `${city}, ${country}`
  if (city || country) return city || country
  const fallback = cityFromTimezone(metadata?.timezone)
  return fallback ? `${fallback} (approx.)` : null
}

export function formatTimezone(metadata = {}) {
  return metadata?.location?.timezone || metadata?.timezone || null
}

/** Le nom de la langue détectée est affiché dans la langue de l'interface. */
export function formatLanguage(metadata = {}, locale = 'fr') {
  const raw = metadata?.language || (metadata?.acceptLanguage || '').split(',')[0]
  if (!raw) return null
  try {
    const name = new Intl.DisplayNames([locale === 'en' ? 'en' : 'fr'], { type: 'language' }).of(raw)
    return name && name !== raw ? `${name} (${raw})` : raw
  } catch {
    return raw
  }
}

/** Abréviations d'unités — « 1 h 05 » en français, « 1h 05 » en anglais. */
const DURATION_UNITS = {
  fr: { s: 's', min: 'min', h: 'h', d: 'j' },
  en: { s: 's', min: 'min', h: 'h', d: 'd' },
}

export function formatDuration(seconds, locale = 'fr') {
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const unit = DURATION_UNITS[locale] || DURATION_UNITS.fr
  if (seconds < 60) return `${Math.round(seconds)} ${unit.s}`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${unit.min}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${unit.h} ${String(minutes % 60).padStart(2, '0')}`
  return `${Math.floor(hours / 24)} ${unit.d} ${String(hours % 24).padStart(2, '0')} ${unit.h}`
}

function shortenUrl(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return value
  }
}

/**
 * Chaque entrée porte `labelKey` (résolu contre `Conversations` côté composant)
 * et, quand la valeur elle-même est traduisible, `valueKey` au lieu de `value`.
 */
export function describeClient(conversation = {}, locale = 'fr') {
  const metadata = conversation.metadata || {}
  const { browser, os, deviceKey } = parseUserAgent(metadata.userAgent)
  const channel = conversation.channel
  const entries = [
    { key: 'location', icon: 'location', labelKey: 'metadataLocation', value: formatLocation(metadata) },
    { key: 'timezone', icon: 'timezone', labelKey: 'metadataTimezone', value: formatTimezone(metadata) },
    { key: 'language', icon: 'language', labelKey: 'metadataLanguage', value: formatLanguage(metadata, locale) },
    { key: 'browser', icon: 'browser', labelKey: 'metadataBrowser', value: browser },
    { key: 'os', icon: 'os', labelKey: 'metadataOs', value: os },
    { key: 'device', icon: 'device', labelKey: 'metadataDevice', valueKey: deviceKey },
    { key: 'channel', icon: 'channel', labelKey: 'metadataChannel', value: CHANNELS[channel] || null, valueKey: channel === 'web' ? 'channelWebsite' : null },
    { key: 'url', icon: 'url', labelKey: 'metadataUrl', value: shortenUrl(metadata.url), title: metadata.url || null },
    { key: 'referrer', icon: 'referrer', labelKey: 'metadataReferrer', value: shortenUrl(metadata.referrer), title: metadata.referrer || null },
    { key: 'ip', icon: 'ip', labelKey: 'metadataIp', value: metadata.ipAddress || null },
    { key: 'duration', icon: 'duration', labelKey: 'metadataDuration', value: formatDuration(conversation.duration, locale) },
  ]
  return entries.filter(entry => Boolean(entry.value || entry.valueKey))
}
