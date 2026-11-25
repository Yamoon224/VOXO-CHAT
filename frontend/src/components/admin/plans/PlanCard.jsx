'use client'

import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PlanFormDialog } from '@/components/admin/plans/PlanFormDialog'
import { formatLimit, formatPrice } from '@/lib/admin-plans.mjs'

const LIMITS = [
  { key: 'messagesPerMonth', label: 'Messages / mois', unit: 'messages' },
  { key: 'messagesPerDay', label: 'Messages / jour', unit: 'messages' },
  { key: 'maxUsers', label: 'Utilisateurs', unit: 'utilisateurs' },
  { key: 'activeDocuments', label: 'Documents actifs', unit: 'documents' },
]

export function PlanCard({ plan, loading, canWrite, onUpdate }) {
  return (
    <SurfaceCard>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{plan.label}</CardTitle>
          <div className="mt-1 space-y-0.5 text-sm font-semibold">
            {['EUR', 'USD', 'XOF'].map((currency) => <p key={currency}>
              {currency} : {plan.prices?.[currency] == null ? 'Non renseigné' : formatPrice(plan.prices[currency], currency)}
            </p>)}
          </div>
          <p className="text-xs text-muted-foreground">{plan.name}</p>
        </div>
        {canWrite && (
          <PlanFormDialog plan={plan} loading={loading} onSubmit={onUpdate} />
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="divide-y">
          {LIMITS.map(({ key, label, unit }) => (
            <div key={key} className="flex items-baseline justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{formatLimit(plan[key], unit)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {Object.entries(plan.features || {}).map(([name, enabled]) => (
            <Badge key={name} variant={enabled ? 'secondary' : 'outline'} className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </SurfaceCard>
  )
}
