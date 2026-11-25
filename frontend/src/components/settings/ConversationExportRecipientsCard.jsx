'use client'

import { useState } from 'react'
import { Mail, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

export function ConversationExportRecipientsCard({ recipients, saving, onSave, readOnly }) {
  const t = useTranslations('SettingsPage')
  const [email, setEmail] = useState('')
  const add = () => {
    const value = email.trim().toLowerCase()
    if (!value || recipients.includes(value)) return
    onSave([...recipients, value])
    setEmail('')
  }
  return <SurfaceCard><CardHeader><CardTitle>{t('exportsTitle')}</CardTitle><CardDescription>{t('exportsDescription')}</CardDescription></CardHeader><CardContent className="space-y-3">
    {recipients.map(item => <div key={item} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><span>{item}</span><Button variant="ghost" size="icon" aria-label={t('removeRecipient', { email: item })} disabled={readOnly || saving} onClick={() => onSave(recipients.filter(emailItem => emailItem !== item))}><Trash2 className="h-4 w-4" /></Button></div>)}
    <div className="flex gap-2"><Input value={email} disabled={readOnly || saving} onChange={event => setEmail(event.target.value)} placeholder="recipient@company.com" type="email" /><Button disabled={readOnly || saving} onClick={add}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button></div>
    {!recipients.length && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{t('noRecipients')}</p>}
  </CardContent></SurfaceCard>
}
