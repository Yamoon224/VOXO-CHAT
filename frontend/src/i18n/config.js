export const locales = ['fr', 'en']
export const defaultLocale = 'fr'

export function normalizeLocale(value) {
  const locale = String(value || '').toLowerCase().split(/[-_,;]/)[0]
  return locales.includes(locale) ? locale : defaultLocale
}
