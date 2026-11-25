'use client'

import { useTranslations } from 'next-intl'
import { MessageCircle, Zap } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { useTenantQuota } from '@/hooks/use-tenant-quota'
import { formatLimit } from '@/lib/admin-plans.mjs'

/**
 * Bandeau de tête des canaux.
 *
 * La version précédente affichait trois tuiles dont deux ne disaient rien :
 * « Portée : Omnicanal », pur décor, et surtout « Messages/mois : Illimité »,
 * qui était FAUX — les forfaits imposent un quota mensuel, lisible sur
 * `/tenant/quota`. Les deux tuiles restantes sont mesurées.
 */
export function ChannelsSummary({ tenant, activeChannelsCount }) {
  const t = useTranslations('Channels')
  const { quota } = useTenantQuota(Boolean(tenant))

  const messagesHint = quota
    ? t('messagesOutOf', { limit: formatLimit(quota.messages.limit, 'messages') })
    : t('usageLoading')

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <StatCard
        variant="plain"
        title={t('activeChannels')}
        value={activeChannelsCount}
        icon={Zap}
        color="blue"
        hint={t('telegramAndWhatsapp')}
      />
      <StatCard
        variant="plain"
        title={t('messagesThisMonth')}
        value={quota?.messages.used}
        icon={MessageCircle}
        color="green"
        hint={messagesHint}
      />
    </div>
  )
}
