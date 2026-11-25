'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatLimit, formatPrice } from '@/lib/admin-plans.mjs'

function PlanCard({ plan, currentPlan, disabled, onRequest, currency, locale, t }) {
  const isCurrent = plan.name === currentPlan
  return (
    <Card className={isCurrent ? 'border-blue-500 ring-1 ring-blue-500' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          {plan.label}<span>{plan.prices?.[currency] == null ? t('priceUnavailable') : formatPrice(plan.prices[currency], currency, locale)}</span>
        </CardTitle>
        <CardDescription>{formatLimit(plan.messagesPerMonth, t('messagesUnit'), t)} {t('perMonth')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>{formatLimit(plan.activeDocuments, t('documentsUnit'), t)}</li>
          <li>{formatLimit(plan.maxUsers, t('usersUnit'), t)}</li>
          {Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([name]) => (
            <li key={name} className="flex items-center gap-1"><Check className="h-3 w-3" />{name}</li>
          ))}
        </ul>
        <Button className="w-full" disabled={disabled || isCurrent} onClick={() => onRequest(plan)}>
          {isCurrent ? t('currentPlanBadge') : t('requestThisPlan')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BillingTab({ billing }) {
  const t = useTranslations('Plans')
  const locale = useLocale()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [note, setNote] = useState('')
  const submit = async () => {
    if (selectedPlan && await billing.requestPlanChange(selectedPlan.name, note)) {
      setSelectedPlan(null)
      setNote('')
    }
  }

  if (billing.loading) return <div className="py-12 text-center">{t('loadingBilling')}</div>
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t('currentPlan')}</CardTitle><CardDescription>{t('usageRealtime')}</CardDescription></CardHeader>
        <CardContent>
          <label className="mb-4 block text-sm font-medium">{t('displayCurrency')} <select className="ml-2 rounded border px-2 py-1" value={billing.currency} onChange={(event) => billing.updateCurrency(event.target.value)}><option value="EUR">Euro (€)</option><option value="USD">Dollar ($)</option><option value="XOF">FCFA</option></select></label>
          <p className="text-lg font-semibold">{billing.quota?.planLabel || '—'}</p>
          <p className="text-sm text-muted-foreground">
            {billing.quota ? t('messagesThisMonth', { used: billing.quota.messages.used, limit: billing.quota.messages.unlimited ? '∞' : billing.quota.messages.limit }) : '—'}
          </p>
          {billing.pendingRequest && <p className="mt-3 text-sm text-amber-700">{t('pendingRequest', { plan: billing.pendingRequest.requestedPlan })}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {billing.plans.map(plan => <PlanCard key={plan.name} plan={plan} currency={billing.currency} currentPlan={billing.quota?.plan}
          disabled={Boolean(billing.pendingRequest) || billing.submitting} onRequest={setSelectedPlan} locale={locale} t={t} />)}
      </div>

      {selectedPlan && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle>{t('confirmRequestTitle')}</CardTitle><CardDescription>{t('requestedPlanLabel', { plan: selectedPlan.label })}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder={t('needsPlaceholder')} maxLength={5000} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedPlan(null)}>{t('cancel')}</Button>
              <Button onClick={submit} disabled={billing.submitting}>
                {billing.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('sendRequest')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
