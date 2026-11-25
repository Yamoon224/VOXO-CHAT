'use client'

import { useLocale, useTranslations } from 'next-intl'
import { LifeBuoy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  STATUS_VARIANTS, formatMessageDate,
} from '@/lib/support.mjs'

export function SupportTicketList({ tickets, loading, activeId, onSelect }) {
  const t = useTranslations('Support')
  const locale = useLocale()
  if (!loading && tickets.length === 0) {
    return (
      <div className="py-12 text-center">
        <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {t('emptyList')}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y rounded-md border">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect(ticket.id)}
          className={`flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-slate-50 ${
            activeId === ticket.id ? 'bg-slate-100' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 truncate font-medium">{ticket.subject}</span>
            <Badge variant={STATUS_VARIANTS[ticket.status]} className="flex-shrink-0 text-xs">
              {t(`statuses.${ticket.status}`)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t(`priorities.${ticket.priority}`)}</span>
            {ticket.reason && <><span>·</span><span>{t(`reasons.${ticket.reason}`)}</span></>}
            <span>·</span>
            <span>{formatMessageDate(ticket.lastMessageAt, locale)}</span>
            {ticket.openedBy && <><span>·</span><span className="truncate">{ticket.openedBy}</span></>}
          </div>
        </button>
      ))}
    </div>
  )
}
