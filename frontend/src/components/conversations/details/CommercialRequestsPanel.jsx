'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { chatAPI } from '@/lib/api'

export function CommercialRequestsPanel({ requests = [], onUpdated }) {
  const t = useTranslations('Conversations')
  if (!requests.length) return null
  return (
    <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h4 className="font-medium text-amber-900">{t('commercialTitle')}</h4>
      {requests.map(request => (
        <div key={request.id} className="grid gap-2 rounded bg-white p-3 text-sm sm:grid-cols-2">
          <p><span className="font-medium">{t('commercialCustomer')}</span> {request.customerName}</p>
          <p><span className="font-medium">{t('commercialPhone')}</span> {request.customerPhone}</p>
          {request.customerEmail && <p><span className="font-medium">{t('commercialEmail')}</span> {request.customerEmail}</p>}
          {request.quantity && <p><span className="font-medium">{t('commercialQuantity')}</span> {request.quantity}</p>}
          <p><span className="font-medium">{t('commercialReason')}</span> {request.reason}</p>
          <Badge variant="outline" className="w-fit">{request.outcomeStatus || request.status}</Badge>
          <div className="flex gap-2"><span>{t('commercialType', { category: request.category || 'other' })}</span>{request.outcomeStatus !== 'successful' && <Button size="sm" variant="outline" onClick={async () => { await chatAPI.updateCommercialRequest(request.id, { outcomeStatus: 'successful' }); onUpdated?.() }}>{t('commercialMarkSuccessful')}</Button>}</div>
        </div>
      ))}
    </section>
  )
}
