/**
 * Libellés de date et d'heure en français.
 *
 * Écrits à la main plutôt qu'avec `Intl` : le moteur JavaScript de React Native
 * n'embarque pas toujours les données de locale, et le SDK n'a besoin que de
 * deux formats. Les formulations reprennent celles du widget web.
 */

import { voxoText, type VoxoLocale } from '../i18n'

const MONTHS = {
fr: [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
],
en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const

/** `14:05`. */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `Aujourd'hui`, `Hier`, ou `23 août 2026`. */
export function formatDaySeparator(timestamp: number, now: number = Date.now(), locale: VoxoLocale = 'fr'): string {
  const date = new Date(timestamp)
  const today = new Date(now)
  const yesterday = new Date(now)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return voxoText(locale, 'today')
  if (isSameDay(date, yesterday)) return voxoText(locale, 'yesterday')
  const month = MONTHS[locale][date.getMonth()]
  return locale === 'en' ? `${month} ${date.getDate()}, ${date.getFullYear()}` : `${date.getDate()} ${month} ${date.getFullYear()}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Deux messages consécutifs séparés par un changement de jour. */
export function needsDaySeparator(current: number, previous: number | undefined): boolean {
  if (previous === undefined) return true
  return !isSameDay(new Date(current), new Date(previous))
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}
