'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useAdminSupport } from '@/hooks/use-admin-support'
import { SupportInboxTable } from '@/components/admin/support/SupportInboxTable'
import { SupportStatsCards } from '@/components/admin/support/SupportStatsCards'
import { PRIORITIES, SUPPORT_REASONS } from '@/lib/support.mjs'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function AdminSupportPage() {
  const t = useTranslations('AdminSupport')
  const tSupport = useTranslations('Support')
  const { canRead, canWrite } = useAdminPermissions()
  const { admin } = useAdminAuth()
  const support = useAdminSupport(canRead('support'))

  const updateFilter = (key, value) => support.setFilters((current) => ({
    ...current,
    [key]: value,
    page: key === 'page' ? value : 1,
  }))

  if (support.loading && support.tickets.length === 0) {
    return <PageSkeleton variant="table" />
  }

  return (
    <>
      <PageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
      />

      <SupportStatsCards stats={support.stats} />

      <SurfaceCard>
        <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={support.filters.status} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t('statusOpen')}</SelectItem>
              <SelectItem value="resolved">{t('statusResolved')}</SelectItem>
              <SelectItem value="closed">{t('statusClosed')}</SelectItem>
              <SelectItem value="all">{t('statusAll')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={support.filters.reason || 'all'} onValueChange={(v) => updateFilter('reason', v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder={t('reasonAllPlaceholder')} /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t('reasonAll')}</SelectItem>{SUPPORT_REASONS.map((reason) => <SelectItem key={reason} value={reason}>{tSupport(`reasons.${reason}`)}</SelectItem>)}</SelectContent>
          </Select>

          <Select
            value={support.filters.priority || 'all'}
            onValueChange={(v) => updateFilter('priority', v === 'all' ? '' : v)}
          >
            <SelectTrigger><SelectValue placeholder={t('priorityAllPlaceholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('priorityAll')}</SelectItem>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {tSupport(`priorities.${priority}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={support.filters.assignedToMe ? 'mine' : 'all'}
            onValueChange={(v) => updateFilter('assignedToMe', v === 'mine')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('assignedAll')}</SelectItem>
              <SelectItem value="mine">{t('assignedMine')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SupportInboxTable
          tickets={support.tickets}
          loading={support.loading}
          adminId={admin?.id}
          writable={canWrite('support')}
          onAssign={support.assign}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('ticketsCount', { count: support.pagination.total })}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={support.pagination.page <= 1}
              onClick={() => updateFilter('page', support.pagination.page - 1)}
            >
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={support.pagination.page >= support.pagination.pages}
              onClick={() => updateFilter('page', support.pagination.page + 1)}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      </CardContent>
      </SurfaceCard>
    </>
  )
}
