'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const LABELS = { wordpress: 'WordPress / WooCommerce', microsoft365: 'Microsoft 365' }

export function ConnectorCard({ provider, connector, onSave, onSync, onDisconnect, onStartMicrosoft }) {
  const t = useTranslations('Integrations')
  const [siteUrl, setSiteUrl] = useState(connector?.config?.siteUrl || '')
  const [token, setToken] = useState('')
  const [drives, setDrives] = useState((connector?.config?.drives || []).join(', '))
  const [frequency, setFrequency] = useState(connector?.syncFrequency || 'daily')
  const connected = connector?.status && connector.status !== 'disconnected'
  const connect = () => provider === 'microsoft365'
    ? onStartMicrosoft({ drives: drives.split(',').map(value => value.trim()).filter(Boolean), syncFrequency: frequency })
    : onSave({ provider, syncFrequency: frequency, config: { siteUrl }, credentials: token ? { token } : {} })
  return <Card>
    <CardHeader><CardTitle>{LABELS[provider]}</CardTitle><CardDescription>{connected ? t('statusConnected', { status: connector.status }) : t('statusNotConnected')}</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      {provider === 'wordpress' ? <Input value={siteUrl} onChange={event => setSiteUrl(event.target.value)} placeholder="https://monsite.fr" /> : <Input value={drives} onChange={event => setDrives(event.target.value)} placeholder={t('sharepointDrivesPlaceholder')} />}
      {provider === 'wordpress' && <Input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder={t('voxoPluginTokenPlaceholder')} />}
      <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={frequency} onChange={event => setFrequency(event.target.value)}><option value="manual">{t('frequencyManual')}</option><option value="daily">{t('frequencyDaily')}</option><option value="weekly">{t('frequencyWeekly')}</option></select>
      {connector?.lastError && <p className="text-sm text-red-600">{connector.lastError}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={connect}>{provider === 'microsoft365' ? t('connectWithMicrosoft') : connected ? t('update') : t('connect')}</Button>{connected && <><Button variant="outline" onClick={() => onSync(connector.id)}>{t('sync')}</Button><Button variant="ghost" onClick={() => onDisconnect(connector.id)}>{t('disconnect')}</Button></>}</div>
    </CardContent>
  </Card>
}
