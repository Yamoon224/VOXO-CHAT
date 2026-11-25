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
import { validateDomainList } from '@shared/allowed-domains.js'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

export function AllowedDomainsCard({ tenant, readOnly = true }) {
  const { toast } = useToast()
  const t = useTranslations('ChatbotSettings')
  const [domains, setDomains] = useState(tenant?.allowedDomains || [])
  const [enforceDomains, setEnforceDomains] = useState(Boolean(tenant?.enforceDomains))
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (nextDomains = domains, nextEnforce = enforceDomains) => {
    setSaving(true)
    try {
      const response = await tenantAPI.updateAllowedDomains({ allowedDomains: nextDomains, enforceDomains: nextEnforce })
      setDomains(response.data.allowedDomains)
      setEnforceDomains(response.data.enforceDomains)
      toast.success(t('domainsUpdated'))
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  const add = () => {
    const result = validateDomainList([...domains, input])
    if (result.error) return toast.error(result.error)
    setInput('')
    save(result.value)
  }

  const remove = (domain) => save(domains.filter(item => item !== domain), enforceDomains && domains.length > 1)
  const toggle = (checked) => save(domains, checked)

  return <SurfaceCard>
    <CardHeader>
      <CardTitle>{t('domainsTitle')}</CardTitle>
      <CardDescription>{t('domainsDescription')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-2">
        <Input value={input} disabled={readOnly || saving} onChange={event => setInput(event.target.value)} placeholder="https://www.example.com" />
        <Button type="button" disabled={readOnly || saving || !input.trim()} onClick={add}><Plus className="h-4 w-4 mr-1" />{t('add')}</Button>
      </div>
      {domains.length ? <ul className="space-y-2">{domains.map(domain => <li key={domain} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><code>{domain}</code><Button size="sm" variant="ghost" aria-label={t('removeDomain', { domain })} disabled={readOnly || saving} onClick={() => remove(domain)}><Trash2 className="h-4 w-4" /></Button></li>)}</ul> : <p className="text-sm text-muted-foreground">{t('noDomains')}</p>}
      <div className="flex items-center justify-between rounded bg-muted p-3"><div><Label htmlFor="enforce-domains">{t('enforceDomains')}</Label><p className="text-xs text-muted-foreground">{t('enforceDomainsHint')}</p></div><Switch id="enforce-domains" checked={enforceDomains} disabled={readOnly || saving || !domains.length} onCheckedChange={toggle} /></div>
    </CardContent>
  </SurfaceCard>
}
