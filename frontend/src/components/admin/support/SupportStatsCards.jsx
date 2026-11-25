'use client'

import { useTranslations } from 'next-intl'
import { Clock3, TicketCheck, TicketPlus, UserRoundX } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'

const minutes = value => value == null ? '—' : `${Math.round(value / 60)} min`

export function SupportStatsCards({ stats }) {
  const t = useTranslations('AdminSupport')
  const tSupport = useTranslations('Support')
  if (!stats) return null
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard title={t('statsOpen')} value={stats.open + stats.pending} icon={TicketPlus} color="orange" hint={t('statsHighPriority', { count: stats.highPriority })} />
    <StatCard title={t('statsResolved')} value={stats.resolved} icon={TicketCheck} color="green" hint={t('statsPeriod')} />
    <StatCard title={t('statsUnassigned')} value={stats.unassigned} icon={UserRoundX} color="purple" hint={t('statsActiveTickets')} />
    <StatCard title={t('statsAvgFirstReply')} value={minutes(stats.avgFirstReplySeconds)} icon={Clock3} color="blue" hint={t('statsResolution', { value: minutes(stats.avgResolutionSeconds) })} />
  </div>{stats.byReason?.length > 0 && <p className="text-xs text-muted-foreground">{t('statsReasons', { value: stats.byReason.map((item) => `${tSupport(`reasons.${item.reason}`)} (${item.tickets})`).join(' · ') })}</p>}</>
}
