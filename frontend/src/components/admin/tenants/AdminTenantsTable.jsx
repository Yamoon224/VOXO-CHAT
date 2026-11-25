'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlockTenantDialog } from '@/components/admin/tenants/BlockTenantDialog'
import { ChangePlanDialog } from '@/components/admin/tenants/ChangePlanDialog'
import { useLocale, useTranslations } from 'next-intl'
export function AdminTenantsTable({
  tenants, plans, loading, canWrite, onStatusChange, onPlanChange,
}) {
  const locale = useLocale()
  const t = useTranslations('AdminTenants')
  // Libellés issus de l'API : plus aucune table de correspondance en dur.
  const labelOf = (name) => plans.find((plan) => plan.name === name)?.label || name

  if (!loading && tenants.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('none')}</p>
  }

  return (
    <div className="divide-y rounded-md border">
      {tenants.map((tenant) => (
        <div key={tenant.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${locale}/admin/tenants/${tenant.id}`}
                  className="font-medium hover:underline"
                >
                  {tenant.name}
                </Link>
                <Badge variant="outline" className="text-xs">
                  {labelOf(tenant.subscriptionPlan)}
                </Badge>
                {!tenant.isActive && <Badge variant="destructive" className="text-xs">{t('blockedOne')}</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {tenant.subdomain || tenant.domain || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/admin/tenants/${tenant.id}`}>{t('details')}</Link>
            </Button>
            {canWrite && (
              <>
                <ChangePlanDialog
                  tenant={tenant}
                  plans={plans}
                  loading={loading}
                  onConfirm={(plan, expiresAt) => onPlanChange(tenant.id, plan, expiresAt)}
                />
                <BlockTenantDialog
                  tenant={tenant}
                  loading={loading}
                  onConfirm={(isActive) => onStatusChange(tenant.id, isActive)}
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
