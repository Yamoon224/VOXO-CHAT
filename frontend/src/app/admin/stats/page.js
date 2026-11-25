'use client'

import { Bot, Building2, Loader2, MessageSquare, Smile, TrendingUp, Users } from 'lucide-react'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminStats } from '@/hooks/use-admin-stats'
import { StatCard } from '@/components/shared/StatCard'
import { StatsPeriodSelector } from '@/components/shared/StatsPeriodSelector'
import { ConversationsTrendChart } from '@/components/shared/ConversationsTrendChart'
import { SatisfactionChart } from '@/components/admin/stats/SatisfactionChart'
import { PaymentCurrencySummary } from '@/components/admin/stats/PaymentCurrencySummary'
import { formatPrice } from '@/lib/admin-plans.mjs'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AdminStatsPage() {
  const { canRead } = useAdminPermissions()
  const { stats, period, setPeriod, loading } = useAdminStats(canRead('stats'))

  if (loading && !stats) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const accounts = stats?.accounts
  const satisfaction = stats?.satisfaction

  return (
    <>
      <PageHeader
        title="Statistiques"
        description="Activité de la plateforme, toutes entreprises confondues."
      >
        <StatsPeriodSelector period={period} onChange={setPeriod} disabled={loading} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          variant="plain"
          title="Utilisateurs"
          value={accounts?.users}
          icon={Users}
          color="blue"
          hint="Membres des entreprises clientes"
        />
        <StatCard
          variant="plain"
          title="Entreprises"
          value={accounts?.tenants}
          icon={Building2}
          color="slate"
          hint={accounts ? `${accounts.activeTenants} active(s)` : undefined}
        />
        {/* L'écart avec le total d'entreprises est volontairement lisible :
            une entreprise inscrite sans trafic n'est pas un chatbot actif. */}
        <StatCard
          variant="plain"
          title="Chatbots actifs"
          value={stats?.activeChatbots}
          icon={Bot}
          color="green"
          hint="Ayant échangé au moins une conversation sur la période"
        />
        <StatCard
          variant="plain"
          title="Conversations"
          value={stats?.conversations?.conversations}
          icon={MessageSquare}
          color="purple"
          hint={stats ? `${stats.conversations.messages.toLocaleString('fr-FR')} messages` : undefined}
        />
        <StatCard
          variant="plain"
          title="Taux de satisfaction"
          value={satisfaction?.rate}
          format="percent"
          icon={Smile}
          color="orange"
          hint={satisfaction?.rate === null
            ? `Données insuffisantes (${satisfaction?.sampleSize ?? 0} avis)`
            : `Sur ${satisfaction?.sampleSize ?? 0} avis`}
        />
        {/* Estimation : aucun paiement n'est encaissé ni vérifié. */}
        <StatCard
          variant="plain"
          title="Revenu mensuel estimé"
          value={stats ? formatPrice(stats.revenue.amount, stats.revenue.currency) : null}
          format="currency"
          icon={TrendingUp}
          color="green"
          hint="Estimation — entreprises actives uniquement"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConversationsTrendChart trend={stats?.trend} loading={loading} />
        <SatisfactionChart satisfaction={satisfaction} loading={loading} />
        <PaymentCurrencySummary payments={stats?.payments} loading={loading} />
      </div>
    </>
  )
}
