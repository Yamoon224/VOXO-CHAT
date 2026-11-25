'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const CURRENCIES = ['EUR', 'USD', 'XOF']
const LIMIT_FIELDS = [['messagesPerMonth', 'Messages par mois'], ['messagesPerDay', 'Messages par jour'], ['maxUsers', 'Utilisateurs'], ['activeDocuments', 'Documents actifs']]
const INITIAL_FORM = { name: '', label: '', prices: { EUR: '0', USD: '', XOF: '' }, billingInterval: 'monthly', creditsPerCycle: '0', allowVisitorAttachments: true, allowAgentAttachments: true, messagesPerMonth: '', messagesPerDay: '', maxUsers: '', activeDocuments: '' }
const INITIAL_FEATURES = { analytics: true, customBranding: false, leadGeneration: false, customAiInstructions: false }
const toLimit = value => value.trim() === '' ? null : Number(value)

export function CreatePlanDialog({ loading, onCreate }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [features, setFeatures] = useState(INITIAL_FEATURES)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const reset = () => { setForm(INITIAL_FORM); setFeatures(INITIAL_FEATURES) }
  const handleOpenChange = value => { setOpen(value); if (value) reset() }
  const submit = async (event) => {
    event.preventDefault()
    const saved = await onCreate({
      ...form,
      name: form.name.trim().toLowerCase(), label: form.label.trim(),
      prices: Object.fromEntries(CURRENCIES.map(currency => [currency, Math.round(Number(form.prices[currency]) * 100)])),
      creditsPerCycle: Number(form.creditsPerCycle || 0),
      ...Object.fromEntries(LIMIT_FIELDS.map(([key]) => [key, toLimit(form[key])])), features,
    })
    if (saved) setOpen(false)
  }
  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button>Ajouter un forfait</Button></DialogTrigger>
    <DialogContent><form onSubmit={submit}>
      <DialogHeader><DialogTitle>Nouveau forfait</DialogTitle></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label htmlFor="new-plan-name">Identifiant</Label><Input id="new-plan-name" value={form.name} onChange={event => set('name', event.target.value)} placeholder="premium" required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="new-plan-label">Nom affiché</Label><Input id="new-plan-label" value={form.label} onChange={event => set('label', event.target.value)} required /></div>
          {CURRENCIES.map(currency => <div key={currency} className="space-y-2"><Label htmlFor={`new-plan-price-${currency}`}>Prix mensuel ({currency})</Label><Input id={`new-plan-price-${currency}`} type="number" min="0" step="0.01" value={form.prices[currency]} onChange={event => set('prices', { ...form.prices, [currency]: event.target.value })} required /></div>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="new-plan-credits">Crédits par cycle</Label><Input id="new-plan-credits" type="number" min="0" value={form.creditsPerCycle} onChange={event => set('creditsPerCycle', event.target.value)} /></div><div className="space-y-2"><Label htmlFor="new-plan-interval">Périodicité</Label><select id="new-plan-interval" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.billingInterval} onChange={event => set('billingInterval', event.target.value)}><option value="monthly">Mensuelle</option><option value="yearly">Annuelle</option></select></div></div>
        <div className="space-y-2 border-t pt-4"><Label>Pièces jointes incluses</Label>{[['allowVisitorAttachments', 'Visiteur vers le chatbot'], ['allowAgentAttachments', 'Agent vers le client']].map(([key, label]) => <div key={key} className="flex items-center justify-between py-1"><span className="text-sm">{label}</span><Switch checked={form[key]} onCheckedChange={value => set(key, value)} disabled={loading} /></div>)}</div>
        <div className="grid gap-4 sm:grid-cols-2">{LIMIT_FIELDS.map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`new-plan-${key}`}>{label}</Label><Input id={`new-plan-${key}`} type="number" min="0" placeholder="Illimité" value={form[key]} onChange={event => set(key, event.target.value)} /></div>)}</div>
        <div className="space-y-2 border-t pt-4"><Label>Caractéristiques</Label>{Object.entries(features).map(([name, enabled]) => <div key={name} className="flex items-center justify-between py-1"><span className="text-sm">{name}</span><Switch checked={enabled} onCheckedChange={value => setFeatures(current => ({ ...current, [name]: value }))} disabled={loading} /></div>)}</div>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button></DialogFooter>
    </form></DialogContent>
  </Dialog>
}
