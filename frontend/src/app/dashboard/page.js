'use client'

import { Clock, MessageSquare, ThumbsUp, Users, CircleCheck } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslations } from 'next-intl'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useAuth } from '@/hooks/use-auth'
import { useAnalytics } from '@/hooks/use-analytics'
import { useConversationsUI } from '@/hooks/use-conversations-ui'
import { useTenantQuota } from '@/hooks/use-tenant-quota'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { StatsPeriodSelector } from '@/components/shared/StatsPeriodSelector'
import { ConversationsTrendChart } from '@/components/shared/ConversationsTrendChart'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard'
import { RecentConversationsCard } from '@/components/dashboard/RecentConversationsCard'
import { CHART_COLORS, CHART_HEIGHT, CHART_TOOLTIP_STYLE } from '@/lib/chart-theme.mjs'
import { Skeleton } from '@/components/ui/skeleton'

const SENTIMENTS = ['positive', 'neutral', 'negative']
const SENTIMENT_FILLS = {
  positive: CHART_COLORS.positive,
  neutral: CHART_COLORS.neutral,
  negative: CHART_COLORS.negative,
}

function LoadingTiles() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardOverview() {
  const t = useTranslations('Dashboard')
  const { user, tenant } = useAuth()
  const { stats, period, setPeriod, loading: statsLoading } = useAnalytics()
  const { filteredConversations, loading: conversationsLoading } = useConversationsUI()
  const { quota } = useTenantQuota(Boolean(tenant))

  const distribution = stats?.sentimentDistribution
  const sentimentData = SENTIMENTS.map((key) => ({
    name: t(`sentiments.${key}`),
    value: distribution?.[key] || 0,
    color: SENTIMENT_FILLS[key],
  }))
  const hasSentiment = sentimentData.some((entry) => entry.value > 0)

  return (
    <>
      <PageHeader
        title={t('greeting', { name: user?.firstName || '' })}
        description={t('overviewDescription')}
      >
        <StatsPeriodSelector period={period} onChange={setPeriod} disabled={statsLoading} />
      </PageHeader>

      {/* Les tuiles n'ont plus de prop `change` : les taux d'évolution étaient
          tous câblés à zéro et le pied affichait « Données stables » quoi qu'il
          arrive. Sans `change`, StatCard ne rend aucun pied. */}
      {statsLoading && !stats ? <LoadingTiles /> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            variant="plain"
            title={t('conversations')}
            value={stats?.totalConversations}
            icon={MessageSquare}
            color="blue"
            hint={t('selectedPeriod')}
          />
          <StatCard
            variant="plain"
            title={t('satisfactionRate')}
            value={stats?.satisfactionRate}
            icon={ThumbsUp}
            format="percent"
            color="green"
            hint={stats?.satisfactionSampleSize
              ? t('reviewsAnalyzed', { count: stats.satisfactionSampleSize })
              : t('notEnoughReviews')}
          />
          <StatCard
            variant="plain"
            title={t('medianResponseTime')}
            value={stats?.avgResponseTime}
            icon={Clock}
            format="time"
            color="orange"
            hint={t('responseTimeHint')}
          />
          <StatCard
            variant="plain"
            title={t('uniqueVisitors')}
            value={stats?.uniqueVisitors}
            icon={Users}
            color="purple"
            hint={t('distinctSessions')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConversationsTrendChart
          trend={stats?.trend}
          loading={statsLoading}
          description={t('dailyConversationVolume')}
        />

        <SurfaceCard>
          <CardHeader>
            <CardTitle className="text-base">{t('customerSatisfaction')}</CardTitle>
            <CardDescription>
              {t('feedbackDistribution')}
              {stats?.satisfactionSampleSize !== undefined && ` (${t('reviewCount', { count: stats.satisfactionSampleSize })})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasSentiment ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {t('noFeedback')}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {sentimentData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {sentimentData.map((entry) => (
                    <div key={entry.name} className="flex items-center">
                      <div
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-muted-foreground">{entry.name}</span>
                      {/* Comptes absolus : le `%` d'avant transformait
                          « 40 avis positifs » en « 40 % ». */}
                      <span className="ml-auto text-sm font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard variant="plain" title={t('resolvedRequests')} value={stats?.commercial?.resolved} icon={CircleCheck} color="green" hint={t('resolvedRequestsHint')} />
        <StatCard variant="plain" title={t('successRate')} value={stats?.commercial?.successRate} icon={ThumbsUp} format="percent" color="blue" hint={t('successCount', { count: stats?.commercial?.successful || 0 })} />
        <StatCard variant="plain" title={t('orderedAmount')} value={stats?.commercial?.successfulOrderAmount} icon={MessageSquare} color="purple" hint={t('orderedAmountHint')} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentConversationsCard
          conversations={conversationsLoading ? [] : filteredConversations}
        />
        <div className="space-y-6">
          <QuickActionsCard />
          <PlanUsageCard quota={quota} fallbackPlan={tenant?.subscriptionPlan} />
        </div>
      </div>
    </>
  )
}
