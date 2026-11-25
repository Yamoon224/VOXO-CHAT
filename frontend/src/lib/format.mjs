/**
 * Formatage localisé des dates, nombres et montants.
 *
 * Point d'entrée unique : partout ailleurs le code passait par
 * `toLocaleDateString('fr-FR')`, ce qui figeait l'affichage en français quelle
 * que soit la langue de l'interface. Ces helpers prennent la locale active
 * (`useLocale()` côté composant) et retombent sur le français si elle est
 * inconnue, comme le reste de la stack.
 */

const INTL_LOCALES = { fr: 'fr-FR', en: 'en-US' }

/** `'en'` → `'en-US'`, tout le reste → `'fr-FR'`. */
export function intlLocale(locale) {
  return INTL_LOCALES[locale] || INTL_LOCALES.fr
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** « 20 août 2026 » / « August 20, 2026 ». */
export function formatDate(value, locale = 'fr') {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale(locale), { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

/** « 20/08/2026 » / « 8/20/2026 » — format court des tableaux. */
export function formatDateShort(value, locale = 'fr') {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale(locale)).format(date)
}

/** « 20 août 2026, 14:03 » / « Aug 20, 2026, 2:03 PM ». */
export function formatDateTime(value, locale = 'fr') {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

/** Heure seule, « 14:03 » / « 2:03 PM ». */
export function formatTime(value, locale = 'fr') {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Séparateurs de milliers selon la locale. */
export function formatNumber(value, locale = 'fr', options) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat(intlLocale(locale), options).format(number)
}

/** Pourcentage déjà exprimé sur 100 (`42` → « 42 % » / « 42% »). */
export function formatPercent(value, locale = 'fr', options) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent', maximumFractionDigits: 1, ...options,
  }).format(number / 100)
}

/** Montant dans sa devise, symbole et position gérés par `Intl`. */
export function formatCurrency(value, currency = 'EUR', locale = 'fr', options) {
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency', currency, maximumFractionDigits: 0, ...options,
  }).format(number)
}

/**
 * Ancienneté relative — renvoie une clé de traduction et ses valeurs plutôt
 * qu'un libellé, le module ne connaissant pas le catalogue. Au-delà d'une
 * semaine, bascule sur la date absolue (`key: 'date'`).
 */
export function timeAgoParts(value, now = new Date()) {
  const date = toDate(value)
  if (!date) return { key: 'date', date: value }
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return { key: 'justNow' }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { key: 'minutes', count: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: 'hours', count: hours }
  const days = Math.floor(hours / 24)
  if (days < 7) return { key: 'days', count: days }
  return { key: 'date', date }
}
