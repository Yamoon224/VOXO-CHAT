'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const CURRENCIES = ['EUR', 'USD', 'XOF']
const LIMIT_FIELDS = [
  ['messagesPerMonth', 'Messages par mois'], ['messagesPerDay', 'Messages par jour'],
  ['maxUsers', 'Utilisateurs'], ['activeDocuments', 'Documents actifs'],
]
const toInput = (value) => value == null ? '' : String(value)
const toLimit = (value) => value.trim() === '' ? null : Number(value)

export function PlanFormDialog({ plan, loading, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [features, setFeatures] = useState({})
  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (!nextOpen) return
    setForm({
      label: plan.label,
      prices: Object.fromEntries(CURRENCIES.map(currency => [currency, plan.prices?.[currency] == null ? '' : String(plan.prices[currency] / 100)])),
      billingInterval: plan.billingInterval || 'monthly',
      creditsPerCycle: String(plan.creditsPerCycle ?? 0),
      allowVisitorAttachments: plan.allowVisitorAttachments !== false,
      allowAgentAttachments: plan.allowAgentAttachments !== false,
      ...Object.fromEntries(LIMIT_FIELDS.map(([key]) => [key, toInput(plan[key])])),
    })
    setFeatures({ ...plan.features })
  }

  const submit = async (event) => {
    event.preventDefault()
    const saved = await onSubmit(plan.id, {
      label: form.label.trim(),
      prices: Object.fromEntries(CURRENCIES.map(currency => [currency, Math.round(Number(form.prices[currency]) * 100)])),
      billingInterval: form.billingInterval,
      creditsPerCycle: Number(form.creditsPerCycle || 0),
      allowVisitorAttachments: form.allowVisitorAttachments,
      allowAgentAttachments: form.allowAgentAttachments,
      ...Object.fromEntries(LIMIT_FIELDS.map(([key]) => [key, toLimit(form[key])])),
      features,
    })
    if (saved) setOpen(false)
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button variant="outline" size="sm">Modifier</Button></DialogTrigger>
    <DialogContent>
      <form onSubmit={submit}>
        <DialogHeader>
          <DialogTitle>Forfait « {plan.label} »</DialogTitle>
          <DialogDescription>Une limite vide signifie « illimité ». Les trois tarifs sont obligatoires.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="plan-label">Nom affiché</Label><Input id="plan-label" value={form.label ?? ''} onChange={event => setField('label', event.target.value)} maxLength={40} required /></div>
            {CURRENCIES.map(currency => <div key={currency} className="space-y-2"><Label htmlFor={`plan-price-${currency}`}>Prix mensuel ({currency})</Label><Input id={`plan-price-${currency}`} type="number" min="0" step="0.01" value={form.prices?.[currency] ?? ''} onChange={event => setField('prices', { ...form.prices, [currency]: event.target.value })} required /></div>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="plan-credits">Crédits par cycle</Label><Input id="plan-credits" type="number" min="0" value={form.creditsPerCycle ?? ''} onChange={event => setField('creditsPerCycle', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="plan-interval">Périodicité</Label><select id="plan-interval" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.billingInterval ?? 'monthly'} onChange={event => setField('billingInterval', event.target.value)}><option value="monthly">Mensuelle</option><option value="yearly">Annuelle</option></select></div>
          </div>
          <div className="space-y-2 border-t pt-4"><Label>Pièces jointes incluses</Label>{[['allowVisitorAttachments', 'Visiteur vers le chatbot'], ['allowAgentAttachments', 'Agent vers le client']].map(([key, label]) => <div key={key} className="flex items-center justify-between py-1"><span className="text-sm">{label}</span><Switch checked={form[key] !== false} onCheckedChange={value => setField(key, value)} disabled={loading} /></div>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">{LIMIT_FIELDS.map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`plan-${key}`}>{label}</Label><Input id={`plan-${key}`} type="number" min="0" placeholder="Illimité" value={form[key] ?? ''} onChange={event => setField(key, event.target.value)} /></div>)}</div>
          <div className="space-y-2 border-t pt-4"><Label>Caractéristiques</Label>{Object.entries(features).map(([name, enabled]) => <div key={name} className="flex items-center justify-between py-1"><span className="text-sm">{name}</span><Switch checked={Boolean(enabled)} onCheckedChange={value => setFeatures(current => ({ ...current, [name]: value }))} disabled={loading} /></div>)}</div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
