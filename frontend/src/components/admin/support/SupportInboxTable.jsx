'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { LifeBuoy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  STATUS_VARIANTS, formatMessageDate,
} from '@/lib/support.mjs'

const PRIORITY_VARIANTS = { high: 'destructive', normal: 'outline', low: 'outline' }

export function SupportInboxTable({ tickets, loading, adminId, writable, onAssign }) {
  const t = useTranslations('Support')
  const tAdmin = useTranslations('AdminSupport')
  const locale = useLocale()
  if (!loading && tickets.length === 0) {
    return (
      <div className="py-12 text-center">
        <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{tAdmin('emptyInbox')}</p>
      </div>
    )
  }

  return (
    <div className="divide-y rounded-md border">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {(!ticket.assignedAdminId || ticket.assignedAdminId === adminId)
                ? <Link href={`/admin/support/${ticket.id}`} className="font-medium hover:underline">{ticket.subject}</Link>
                : <span className="font-medium">{ticket.subject}</span>}
              <Badge variant={STATUS_VARIANTS[ticket.status]} className="text-xs">
                {t(`adminStatuses.${ticket.status}`)}
              </Badge>
              {ticket.priority === 'high' && (
                <Badge variant={PRIORITY_VARIANTS[ticket.priority]} className="text-xs">
                  {t(`priorities.${ticket.priority}`)}
                </Badge>
              )}
              {ticket.reason && <Badge variant="outline" className="text-xs">{t(`reasons.${ticket.reason}`)}</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {ticket.tenantName}
              {ticket.openedBy && ` · ${ticket.openedBy}`}
              {` · ${formatMessageDate(ticket.lastMessageAt, locale)}`}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {ticket.assignedAdmin
              ? <Badge variant="secondary" className="text-xs">{ticket.assignedAdmin}</Badge>
              : <Badge variant="outline" className="text-xs">{tAdmin('unassigned')}</Badge>}
            {ticket.assignedAdminId === adminId && <Button variant="ghost" size="sm" asChild><Link href={`/admin/support/${ticket.id}`}>{tAdmin('open')}</Link></Button>}
            {writable && ticket.assignedAdminId !== adminId && <Button variant="outline" size="sm" onClick={() => onAssign(ticket.id)}>{ticket.assignedAdminId ? tAdmin('reassignToMe') : tAdmin('takeOwnership')}</Button>}
          </div>
        </div>
      ))}
    </div>
  )
}
