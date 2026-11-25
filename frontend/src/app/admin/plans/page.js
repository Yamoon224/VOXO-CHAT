'use client'

import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminPlans } from '@/hooks/use-admin-plans'
import { PlanCard } from '@/components/admin/plans/PlanCard'
import { CreatePlanDialog } from '@/components/admin/plans/CreatePlanDialog'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function AdminPlansPage() {
  const { canRead, canWrite } = useAdminPermissions()
  const { plans, loading, actionLoading, updatePlan, createPlan } = useAdminPlans(canRead('plans'))

  if (loading && plans.length === 0) {
    return <PageSkeleton />
  }

  return (
    <>
      <PageHeader
        title="Forfaits"
        description="Prix, limites et caractéristiques des quatre paliers. Une modification s’applique immédiatement à toutes les entreprises concernées. Les compteurs journaliers se réinitialisent à minuit UTC."
      >{canWrite('plans') && <CreatePlanDialog loading={actionLoading} onCreate={createPlan} />}</PageHeader>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            loading={actionLoading}
            canWrite={canWrite('plans')}
            onUpdate={updatePlan}
          />
        ))}
      </div>
    </>
  )
}
