'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminTenantDetail } from '@/hooks/use-admin-tenants'
import { useAdminPlans } from '@/hooks/use-admin-plans'
import { TenantDetailCards } from '@/components/admin/tenants/TenantDetailCards'
import { BlockTenantDialog } from '@/components/admin/tenants/BlockTenantDialog'
import { ChangePlanDialog } from '@/components/admin/tenants/ChangePlanDialog'
import { useLocale, useTranslations } from 'next-intl'

export default function AdminTenantDetailPage() {
  const locale = useLocale()
  const t = useTranslations('AdminTenants')
  const { id } = useParams()
  const { canRead, canWrite } = useAdminPermissions()
  const detail = useAdminTenantDetail(id, canRead('tenants'))
  const { plans } = useAdminPlans(canRead('tenants'))
  const { tenant } = detail

  if (detail.loading && !tenant) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/tenants`}><ArrowLeft className="mr-2 h-4 w-4" />{t('back')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
            <Link href={`/${locale}/admin/tenants`}><ArrowLeft className="mr-2 h-4 w-4" />{t('companies')}</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{tenant.name}</h1>
            {!tenant.isActive && <Badge variant="destructive">{t('blocked')}</Badge>}
          </div>
        </div>

        {canWrite('tenants') && (
          <div className="flex flex-shrink-0 gap-2">
            <ChangePlanDialog
              tenant={tenant}
              plans={plans}
              loading={detail.actionLoading}
              onConfirm={detail.updatePlan}
            />
            <BlockTenantDialog
              tenant={tenant}
              loading={detail.actionLoading}
              onConfirm={detail.setStatus}
            />
          </div>
        )}
      </div>

      <TenantDetailCards tenant={tenant} />
    </div>
  )
}
