'use client'

import Link from 'next/link'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatLimit } from '@/lib/admin-plans.mjs'
import { useLocale, useTranslations } from 'next-intl'

/**
 * Forfait et consommation réelle de l'entreprise.
 *
 * Tout vient de `/tenant/quota`. Une version antérieure divisait par 100 en dur
 * ET comptait des conversations alors que le quota porte sur les MESSAGES :
 * elle était fausse sur les deux plans.
 *
 * Le dégradé bleu plein a disparu au profit d'une carte sobre : il faisait de
 * cette carte l'élément le plus bruyant de la page, juste après qu'on eut
 * retiré celui de la barre latérale pour la même raison.
 */
export function PlanUsageCard({ quota, fallbackPlan }) {
  const locale = useLocale()
  const t = useTranslations('Dashboard')
  const percent = quota && !quota.messages.unlimited
    ? Math.min(Math.round((quota.messages.used / quota.messages.limit) * 100), 100)
    : 100

  return (
    <SurfaceCard>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Forfait {quota?.planLabel || fallbackPlan || '—'}
        </CardTitle>
        <Badge variant="secondary">{quota?.planLabel || '—'}</Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {quota ? `${formatLimit(quota.messages.limit, 'messages')}/mois` : '—'}
        </p>

        <Progress value={percent} className="h-1.5" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {quota
              ? `${quota.messages.used}/${quota.messages.unlimited ? '∞' : quota.messages.limit} messages ce mois`
              : '—'}
          </span>
          {quota && !quota.messagesDaily.unlimited && (
            <span>{quota.messagesDaily.used}/{quota.messagesDaily.limit} aujourd’hui</span>
          )}
        </div>

        {quota?.plan !== 'enterprise' && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/${locale}/dashboard/billing`}>{t('viewPlans')}</Link>
          </Button>
        )}
      </CardContent>
    </SurfaceCard>
  )
}
