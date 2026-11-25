'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSupport } from '@/hooks/use-support'
import { SupportTicketList } from '@/components/support/SupportTicketList'
import { SupportThread } from '@/components/support/SupportThread'
import { SupportComposer } from '@/components/support/SupportComposer'
import { NewTicketDialog } from '@/components/support/NewTicketDialog'
import { STATUS_VARIANTS } from '@/lib/support.mjs'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function SupportPage() {
  const t = useTranslations('Support')
  const support = useSupport()
  const [activeId, setActiveId] = useState(null)

  const handleSelect = async (id) => {
    setActiveId(id)
    await support.openTicket(id)
  }

  const handleCreate = async (data) => {
    const succeeded = await support.createTicket(data)
    if (succeeded && support.ticket) setActiveId(support.ticket.id)
    return succeeded
  }

  const handleBack = () => {
    setActiveId(null)
    support.closeTicket()
  }

  const ticket = support.ticket

  // Vue « fil » une fois une demande ouverte.
  if (activeId && ticket) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 w-fit" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t('backToList')}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
            <Badge variant={STATUS_VARIANTS[ticket.status]} className="text-xs">
              {t(`statuses.${ticket.status}`)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {t(`priorities.${ticket.priority}`)}
            </Badge>
            {ticket.reason && <Badge variant="outline" className="text-xs">{t(`reasons.${ticket.reason}`)}</Badge>}
          </div>
        </CardHeader>

        {ticket.reason === 'other' && <CardContent className="pt-0 text-sm text-muted-foreground">{t('precision', { value: ticket.otherReason })}</CardContent>}

        <CardContent className="space-y-5">
          <SupportThread messages={ticket.messages} viewerType="tenant" />
          <SupportComposer
            loading={support.actionLoading}
            disabled={ticket.status === 'closed'}
            onSend={(content, _internal, clientMessageId) =>
              support.reply(ticket.id, content, clientMessageId)}
          />
        </CardContent>
      </Card>
    )
  }

  if (support.loading && support.tickets.length === 0) {
    return <PageSkeleton variant="table" />
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>
            {t('pageDescription')}
          </CardDescription>
        </div>
        <NewTicketDialog loading={support.actionLoading} onCreate={handleCreate} />
      </CardHeader>

      <CardContent>
        <SupportTicketList
          tickets={support.tickets}
          loading={support.loading}
          activeId={activeId}
          onSelect={handleSelect}
        />
      </CardContent>
    </Card>
  )
}
