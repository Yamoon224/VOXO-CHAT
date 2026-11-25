'use client'

import { useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatDate, formatDateShort, formatDateTime, formatNumber, formatTime, timeAgoParts } from '@/lib/format.mjs'

/**
 * Formateurs liés à la locale active.
 *
 * Évite de répéter `useLocale()` puis le passage manuel de la locale à chaque
 * helper de `@/lib/format.mjs` dans les composants.
 */
export function useFormatters() {
  const locale = useLocale()
  return {
    locale,
    date: useCallback(value => formatDate(value, locale), [locale]),
    dateShort: useCallback(value => formatDateShort(value, locale), [locale]),
    dateTime: useCallback(value => formatDateTime(value, locale), [locale]),
    time: useCallback(value => formatTime(value, locale), [locale]),
    number: useCallback((value, options) => formatNumber(value, locale, options), [locale]),
  }
}

/**
 * « À l'instant », « 12 min », « 3 j » puis date absolue au-delà d'une semaine.
 * Les libellés vivent dans le namespace `Conversations`, le seul à en avoir
 * besoin aujourd'hui.
 */
export function useTimeAgo() {
  const locale = useLocale()
  const t = useTranslations('Conversations')
  return useCallback(value => {
    const parts = timeAgoParts(value)
    if (parts.key === 'justNow') return t('timeAgoJustNow')
    if (parts.key === 'minutes') return t('timeAgoMinutes', { count: parts.count })
    if (parts.key === 'hours') return t('timeAgoHours', { count: parts.count })
    if (parts.key === 'days') return t('timeAgoDays', { count: parts.count })
    return formatDate(parts.date, locale)
  }, [locale, t])
}
