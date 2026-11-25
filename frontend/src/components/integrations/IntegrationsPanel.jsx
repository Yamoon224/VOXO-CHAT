'use client'

import { useTranslations } from 'next-intl'
import { ConnectorCard } from '@/components/integrations/ConnectorCard'
import { useIntegrations } from '@/hooks/use-integrations'

export function IntegrationsPanel() {
  const t = useTranslations('Integrations')
  const { connectors, loading, save, sync, disconnect, startMicrosoft } = useIntegrations()
  const byProvider = provider => connectors.find(connector => connector.provider === provider)
  if (loading) return <p className="text-sm text-muted-foreground">{t('loadingIntegrations')}</p>
  return <section className="space-y-4"><div><h2 className="text-xl font-semibold">{t('connectedSources')}</h2><p className="text-sm text-muted-foreground">{t('connectedSourcesDescription')}</p></div><div className="grid gap-4 lg:grid-cols-2"><ConnectorCard provider="wordpress" connector={byProvider('wordpress')} onSave={save} onSync={sync} onDisconnect={disconnect} /><ConnectorCard provider="microsoft365" connector={byProvider('microsoft365')} onSave={save} onSync={sync} onDisconnect={disconnect} onStartMicrosoft={startMicrosoft} /></div></section>
}
