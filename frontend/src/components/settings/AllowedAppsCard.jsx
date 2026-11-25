'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { tenantAPI } from '@/lib/api'
import { validateAppIdList } from '@shared/allowed-apps.js'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

// Pendant mobile des domaines autorisés : identifiants (bundle id / package name) des applications
// qui peuvent utiliser le chatbot. Garde-fou contre l'usage involontaire, PAS une authentification :
// l'en-tête X-App-Id est déclaratif (voir mobile/CONTRACT.md).
export function AllowedAppsCard({ tenant, readOnly = true }) {
  const { toast } = useToast()
  const t = useTranslations('ChatbotSettings')
  const [appIds, setAppIds] = useState(tenant?.allowedAppIds || [])
  const [enforce, setEnforce] = useState(Boolean(tenant?.enforceAppIds))
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (nextIds = appIds, nextEnforce = enforce) => {
    setSaving(true)
    try {
      const response = await tenantAPI.updateAllowedApps({ allowedAppIds: nextIds, enforceAppIds: nextEnforce })
      setAppIds(response.data.allowedAppIds)
      setEnforce(response.data.enforceAppIds)
      toast.success(t('appsUpdated'))
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  const add = () => {
    const result = validateAppIdList([...appIds, input])
    if (result.error) return toast.error(result.error)
    setInput('')
    save(result.value)
  }

  const remove = (appId) => save(appIds.filter(item => item !== appId), enforce && appIds.length > 1)

  return <SurfaceCard>
    <CardHeader>
      <CardTitle>{t('appsTitle')}</CardTitle>
      <CardDescription>{t('appsDescription')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-2">
        <Input value={input} disabled={readOnly || saving} onChange={event => setInput(event.target.value)} placeholder="com.example.app" />
        <Button type="button" disabled={readOnly || saving || !input.trim()} onClick={add}><Plus className="h-4 w-4 mr-1" />{t('add')}</Button>
      </div>
      {appIds.length ? <ul className="space-y-2">{appIds.map(appId => <li key={appId} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><code>{appId}</code><Button size="sm" variant="ghost" aria-label={t('removeApp', { appId })} disabled={readOnly || saving} onClick={() => remove(appId)}><Trash2 className="h-4 w-4" /></Button></li>)}</ul> : <p className="text-sm text-muted-foreground">{t('noApps')}</p>}
      <div className="flex items-center justify-between rounded bg-muted p-3"><div><Label htmlFor="enforce-apps">{t('enforceApps')}</Label><p className="text-xs text-muted-foreground">{t('enforceAppsHint')}</p></div><Switch id="enforce-apps" checked={enforce} disabled={readOnly || saving || !appIds.length} onCheckedChange={checked => save(appIds, checked)} /></div>
      <p className="text-xs text-muted-foreground">{t('appsDisclaimer')}</p>
    </CardContent>
  </SurfaceCard>
}
