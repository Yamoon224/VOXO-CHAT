'use client'

import { Clock, Globe, Languages, Link2, MapPin, MessageSquare, Monitor, Share2, Smartphone, Timer } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { describeClient } from '@/lib/client-metadata.mjs'

const ICONS = {
  location: MapPin, timezone: Clock, language: Languages, browser: Monitor, os: Monitor,
  device: Smartphone, channel: MessageSquare, url: Link2, referrer: Share2, ip: Globe, duration: Timer,
}

export function ClientMetadataList({ conversation }) {
  const t = useTranslations('Conversations')
  const locale = useLocale()
  const entries = describeClient(conversation, locale)
  if (entries.length === 0) return <p className="mt-2 text-xs text-gray-500">{t('metadataEmpty')}</p>
  return (
    <dl className="mt-2 space-y-2">
      {entries.map(entry => {
        const Icon = ICONS[entry.icon] || Globe
        const label = t(entry.labelKey)
        const value = entry.valueKey ? t(entry.valueKey) : entry.value
        return (
          <div key={entry.key} className="flex items-start gap-2 text-xs text-gray-600">
            <Icon className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
            <dt className="sr-only">{label}</dt>
            <dd className="min-w-0 flex-1 break-words" title={entry.title || `${label} : ${value}`}>{value}</dd>
          </div>
        )
      })}
    </dl>
  )
}
