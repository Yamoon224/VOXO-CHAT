'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { tenantAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

// Notifications push des applications mobiles. Les identifiants d'envoi (compte de service FCM,
// clé APNs) sont ceux de l'application du client, pas ceux de VOXO : ils sont chiffrés côté serveur
// et ne sont JAMAIS renvoyés — les champs secrets sont en écriture seule.
const EMPTY_APNS = { keyId: '', teamId: '', bundleId: '', sandbox: false, privateKey: '' }

export function MobilePushCard({ readOnly = true }) {
  const { toast } = useToast()
  const t = useTranslations('ChatbotSettings')
  const [status, setStatus] = useState(null)
  const [fcmJson, setFcmJson] = useState('')
  const [apns, setApns] = useState(EMPTY_APNS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    tenantAPI.getMobilePush().then(response => {
      setStatus(response.data)
      setApns(current => ({ ...current, ...pickPublicApns(response.data.apns) }))
    }).catch(() => {})
  }, [])

  const save = async (payload, successKey = 'pushUpdated') => {
    setSaving(true)
    try {
      const response = await tenantAPI.updateMobilePush(payload)
      setStatus(response.data)
      setFcmJson('')
      setApns(current => ({ ...current, ...pickPublicApns(response.data.apns), privateKey: '' }))
      toast.success(t(successKey))
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  const saveFcm = () => save({ fcm: { serviceAccount: fcmJson } })
  const saveApns = () => {
    const { privateKey, ...identifiers } = apns
    save({ apns: { ...identifiers, ...(privateKey.trim() ? { privateKey } : {}) } })
  }
  const disabled = readOnly || saving
  const anyConfigured = Boolean(status?.fcm?.configured || status?.apns?.configured)

  return <SurfaceCard>
    <CardHeader>
      <CardTitle>{t('pushTitle')}</CardTitle>
      <CardDescription>{t('pushDescription')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="flex items-center justify-between rounded bg-muted p-3">
        <div><Label htmlFor="push-enabled">{t('pushEnabled')}</Label><p className="text-xs text-muted-foreground">{t('pushEnabledHint')}</p></div>
        <Switch id="push-enabled" checked={Boolean(status?.enabled)} disabled={disabled || !anyConfigured} onCheckedChange={checked => save({ enabled: checked })} />
      </div>
      <div className="flex items-center justify-between rounded bg-muted p-3">
        <div><Label htmlFor="push-text">{t('pushIncludeText')}</Label><p className="text-xs text-muted-foreground">{t('pushIncludeTextHint')}</p></div>
        <Switch id="push-text" checked={status?.includeMessageText !== false} disabled={disabled} onCheckedChange={checked => save({ includeMessageText: checked })} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('pushFcmTitle')} <StatusBadge configured={status?.fcm?.configured} t={t} /></h3>
        <p className="text-xs text-muted-foreground">{t('pushFcmHint')}</p>
        <Textarea rows={5} value={fcmJson} disabled={disabled} onChange={event => setFcmJson(event.target.value)} placeholder={t('pushFcmPlaceholder')} autoComplete="off" spellCheck={false} />
        <div className="flex gap-2">
          <Button type="button" disabled={disabled || !fcmJson.trim()} onClick={saveFcm}>{t('pushSave')}</Button>
          {status?.fcm?.configured && <Button type="button" variant="outline" disabled={disabled} onClick={() => save({ fcm: { remove: true } })}>{t('pushRemove')}</Button>}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('pushApnsTitle')} <StatusBadge configured={status?.apns?.configured} t={t} /></h3>
        <p className="text-xs text-muted-foreground">{t('pushApnsHint')}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input value={apns.keyId} disabled={disabled} onChange={event => setApns({ ...apns, keyId: event.target.value })} placeholder="Key ID" aria-label="Key ID" />
          <Input value={apns.teamId} disabled={disabled} onChange={event => setApns({ ...apns, teamId: event.target.value })} placeholder="Team ID" aria-label="Team ID" />
          <Input value={apns.bundleId} disabled={disabled} onChange={event => setApns({ ...apns, bundleId: event.target.value })} placeholder="com.example.app" aria-label="Bundle ID" />
        </div>
        <Textarea rows={4} value={apns.privateKey} disabled={disabled} onChange={event => setApns({ ...apns, privateKey: event.target.value })} placeholder={t('pushApnsKeyPlaceholder')} autoComplete="off" spellCheck={false} />
        <div className="flex items-center gap-2"><Switch id="push-sandbox" checked={apns.sandbox} disabled={disabled} onCheckedChange={checked => setApns({ ...apns, sandbox: checked })} /><Label htmlFor="push-sandbox">{t('pushApnsSandbox')}</Label></div>
        <div className="flex gap-2">
          <Button type="button" disabled={disabled || !apns.keyId || !apns.teamId || !apns.bundleId || (!apns.privateKey.trim() && !status?.apns?.configured)} onClick={saveApns}>{t('pushSave')}</Button>
          {status?.apns?.configured && <Button type="button" variant="outline" disabled={disabled} onClick={() => save({ apns: { remove: true } })}>{t('pushRemove')}</Button>}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">{t('pushPrivacy')}</p>
    </CardContent>
  </SurfaceCard>
}

function pickPublicApns(apns = {}) {
  return { keyId: apns.keyId || '', teamId: apns.teamId || '', bundleId: apns.bundleId || '', sandbox: apns.sandbox === true }
}

function StatusBadge({ configured, t }) {
  return <span className={`ml-2 rounded px-2 py-0.5 text-xs font-normal ${configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{configured ? t('pushConfigured') : t('pushNotConfigured')}</span>
}
