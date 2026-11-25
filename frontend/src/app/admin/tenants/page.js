'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminTenants } from '@/hooks/use-admin-tenants'
import { AdminTenantsTable } from '@/components/admin/tenants/AdminTenantsTable'
import { useAdminPlans } from '@/hooks/use-admin-plans'
import { useTranslations } from 'next-intl'

export default function AdminTenantsPage() {
  const t = useTranslations('AdminTenants')
  const { canRead, canWrite } = useAdminPermissions()
  const tenants = useAdminTenants(canRead('tenants'))
  // Les forfaits alimentent le filtre et le sélecteur : la liste vient du
  // serveur, jamais d'une énumération figée côté client.
  const { plans } = useAdminPlans(canRead('tenants'))

  const updateFilter = (key, value) => tenants.setFilters((current) => ({
    ...current,
    [key]: value,
    page: key === 'page' ? value : 1,
  }))

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <SurfaceCard>
        <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('search')}
              value={tenants.filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <Select
            value={tenants.filters.subscriptionPlan || 'all'}
            onValueChange={(value) => updateFilter('subscriptionPlan', value === 'all' ? '' : value)}
          >
            <SelectTrigger><SelectValue placeholder={t('allPlans')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPlans')}</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.name} value={plan.name}>{plan.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tenants.filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="active">{t('active')}</SelectItem>
              <SelectItem value="inactive">{t('blocked')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AdminTenantsTable
          tenants={tenants.tenants}
          plans={plans}
          loading={tenants.loading || tenants.actionLoading}
          canWrite={canWrite('tenants')}
          onStatusChange={tenants.setTenantStatus}
          onPlanChange={tenants.updateTenantPlan}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('count', { count: tenants.pagination.total })}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={tenants.pagination.page <= 1}
              onClick={() => updateFilter('page', tenants.pagination.page - 1)}
            >
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tenants.pagination.page >= tenants.pagination.pages}
              onClick={() => updateFilter('page', tenants.pagination.page + 1)}
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
