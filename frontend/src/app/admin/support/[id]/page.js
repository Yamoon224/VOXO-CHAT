'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminSupportTicket } from '@/hooks/use-admin-support'
import { SupportThread } from '@/components/support/SupportThread'
import { SupportComposer } from '@/components/support/SupportComposer'
import { ApprovePlanChangeDialog } from '@/components/admin/support/ApprovePlanChangeDialog'
import { STATUS_VARIANTS } from '@/lib/support.mjs'

const STATUSES = ['open', 'pending', 'resolved', 'closed']

export default function AdminSupportTicketPage() {
  const locale = useLocale()
  const { id } = useParams()
  const t = useTranslations('AdminSupport')
  const tSupport = useTranslations('Support')
  const { admin } = useAdminAuth()
  const { canRead, canWrite } = useAdminPermissions()
  const detail = useAdminSupportTicket(id, canRead('support'))
  const { ticket } = detail
  const writable = canWrite('support')
  const canApprovePlanChange = writable && canWrite('tenants')
    && ticket?.type === 'plan_change' && ['open', 'pending'].includes(ticket.status)

  if (detail.loading && !ticket) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/support`}><ArrowLeft className="mr-2 h-4 w-4" />{t('back')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
      </div>
    )
  }

  const isMine = ticket.assignedAdminId === admin?.id
  const isUnassigned = !ticket.assignedAdminId

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
          <Link href={`/${locale}/admin/support`}><ArrowLeft className="mr-2 h-4 w-4" />{t('backToRequests')}</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">{ticket.subject}</h1>
          <Badge variant={STATUS_VARIANTS[ticket.status]}>
            {tSupport(`adminStatuses.${ticket.status}`)}
          </Badge>
          <Badge variant="outline">{tSupport(`priorities.${ticket.priority}`)}</Badge>
          {ticket.reason && <Badge variant="outline">{tSupport(`reasons.${ticket.reason}`)}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href={`/${locale}/admin/tenants/${ticket.tenantId}`} className="hover:underline">{ticket.tenantName}</Link>
          {ticket.openedBy && t('openedBy', { name: ticket.openedBy })}
        </p>
        {ticket.reason === 'other' && <p className="mt-1 text-sm text-muted-foreground">{tSupport('precision', { value: ticket.otherReason })}</p>}
        {ticket.type === 'plan_change' && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('requestedPlan')}<strong>{ticket.requestedPlan}</strong>{ticket.requestNote && ` · ${ticket.requestNote}`}
          </p>
        )}
      </div>

      {writable && (
        <SurfaceCard>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            {isUnassigned && (
              <Button size="sm" disabled={detail.actionLoading} onClick={detail.assign}>
                {t('takeCharge')}
              </Button>
            )}
            {isMine && (
              <Button variant="outline" size="sm" disabled={detail.actionLoading} onClick={detail.release}>
                {t('releaseMe')}
              </Button>
            )}
            {!isUnassigned && !isMine && (
              <Badge variant="secondary">{t('assignedToBadge', { name: ticket.assignedAdmin })}</Badge>
            )}

            <Select
              value={ticket.status}
              onValueChange={detail.setStatus}
              disabled={detail.actionLoading}
            >
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {tSupport(`adminStatuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canApprovePlanChange && (
              <ApprovePlanChangeDialog ticket={ticket} loading={detail.actionLoading}
                onApprove={detail.approvePlanChange} />
            )}
          </CardContent>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <CardHeader><CardTitle className="text-base">{t('conversationTitle')}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Vue admin : les notes internes y figurent, signalées comme telles. */}
          <SupportThread messages={ticket.messages} viewerType="admin" />
          {writable && (
            <SupportComposer
              loading={detail.actionLoading}
              disabled={ticket.status === 'closed'}
              allowInternal
              onSend={detail.reply}
            />
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  )
}
