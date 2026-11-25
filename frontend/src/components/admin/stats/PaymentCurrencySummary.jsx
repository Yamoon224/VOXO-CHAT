import { CreditCard, Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/admin-plans.mjs'

export function PaymentCurrencySummary({ payments, loading }) {
  if (!payments && loading) return <Card className="lg:col-span-2"><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des paiements…</CardContent></Card>

  const byCurrency = payments?.byCurrency || []
  const dominant = payments?.dominantCurrency

  return <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Paiements encaissés</CardTitle>
      <CardDescription>Transactions payées sur la période sélectionnée, sans conversion de devise.</CardDescription>
    </CardHeader>
    <CardContent>
      {!payments?.totalPayments ? <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Aucun paiement encaissé sur cette période.</div> : <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-4">
          <div><p className="text-sm text-muted-foreground">Paiements encaissés</p><p className="text-2xl font-semibold">{payments.totalPayments}</p></div>
          {dominant && <div className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-amber-500" /><span>Devise la plus utilisée : <strong>{dominant.currency}</strong> ({dominant.percentage} %)</span></div>}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {byCurrency.map(item => <div key={item.currency} className="rounded-lg border p-4">
            <div className="flex items-baseline justify-between gap-2"><p className="font-semibold">{item.currency}</p><p className="text-xs text-muted-foreground">{item.payments} paiement(s)</p></div>
            <p className="mt-2 text-xl font-semibold">{formatPrice(item.amount, item.currency)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-600" style={{ width: `${item.percentage}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{item.percentage} % des paiements</p>
          </div>)}
        </div>
      </div>}
    </CardContent>
  </Card>
}
