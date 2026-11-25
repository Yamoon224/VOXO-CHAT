'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { KeyRound, MessageCircle, Power, RefreshCw, ShieldCheck, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WhatsAppChannelCard({ status, loading, onTest, onRegister, onDisconnect }) {
  const t = useTranslations('Channels')
  const locale = useLocale()
  const [settings, setSettings] = useState({ phoneNumberId: status.phoneNumberId || '', accessToken: '', appSecret: '' })
  const update = (key) => (event) => setSettings((current) => ({ ...current, [key]: event.target.value }))
  const canTest = settings.phoneNumberId && (settings.accessToken || status.phoneNumberId)
  const canRegister = canTest && (settings.appSecret || status.phoneNumberId)

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-green-500" />
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3"><div className="rounded-lg bg-green-500 p-2 text-white"><MessageCircle className="h-6 w-6" /></div><div><CardTitle className="text-xl">{t('whatsappViaMeta')}</CardTitle><CardDescription>{t('whatsappDescription')}</CardDescription></div></div>
          <Badge variant={status.webhookActive ? 'success' : 'secondary'} className={status.webhookActive ? 'bg-green-100 text-green-700' : ''}>{status.webhookActive ? t('connected') : t('notConfigured')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label htmlFor="meta-phone-id">Phone Number ID</Label><Input id="meta-phone-id" value={settings.phoneNumberId} onChange={update('phoneNumberId')} placeholder={t('metaPhoneIdPlaceholder')} /></div>
        <div className="space-y-2"><Label htmlFor="meta-token">{t('permanentAccessToken')}</Label><Input id="meta-token" type="password" value={settings.accessToken} onChange={update('accessToken')} placeholder="EAAG..." /></div>
        <div className="space-y-2"><Label htmlFor="meta-secret">App Secret</Label><Input id="meta-secret" type="password" value={settings.appSecret} onChange={update('appSecret')} placeholder={t('metaAppSecretPlaceholder')} /></div>
        {(status.displayPhoneNumber || status.lastError) && <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm"><p className="font-semibold">{status.verifiedName || status.displayPhoneNumber || t('whatsappBusiness')}</p><p className="text-xs text-gray-500">{status.displayPhoneNumber || status.phoneNumberId}</p>{status.lastError && <p className="mt-1 text-xs text-red-600">{status.lastError}</p>}</div>}
        {status.webhookActive && status.webhookUrl && <div className="space-y-1 rounded-lg border bg-gray-50 p-3 text-xs"><p className="font-semibold">{t('metaConfigToCopy')}</p><p className="break-all"><span className="text-gray-500">URL : </span>{status.webhookUrl}</p><p className="break-all"><span className="text-gray-500">{t('tokenLabel')} </span>{status.verifyToken}</p></div>}
        <div className="flex items-start space-x-3 rounded-lg bg-green-50 p-4 text-sm text-green-900"><ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" /><p>{t('whatsappSetupHint')} <code>messages</code>.</p></div>
      </CardContent>
      <CardFooter className="flex justify-between border-t bg-gray-50 py-4">
        <div className="flex items-center gap-2"><Button variant="ghost" size="sm" asChild><Link href={`/${locale}/dashboard/integration/whatsapp`}>{t('guide')}</Link></Button><Button variant="outline" onClick={() => onTest(settings)} disabled={loading || !canTest}>{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}{t('verify')}</Button></div>
        {status.webhookActive ? <Button variant="destructive" onClick={onDisconnect} disabled={loading}><Power className="mr-2 h-4 w-4" />{t('disconnect')}</Button> : <Button onClick={() => onRegister(settings)} disabled={loading || !canRegister} className="bg-green-600 hover:bg-green-700"><Zap className="mr-2 h-4 w-4" />{t('register')}</Button>}
      </CardFooter>
    </Card>
  )
}
