'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { describePlan, formatPrice } from '@/lib/admin-plans.mjs'

/** Une date ISO → « YYYY-MM-DD », le format attendu par un input date. */
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

/**
 * Changement de forfait — le levier de restriction réellement appliqué : les
 * limites de messages, de documents et de sièges en découlent immédiatement.
 *
 * Les forfaits proposés viennent de l'API : plus aucune liste ni limite en dur.
 */
export function ChangePlanDialog({ tenant, plans, loading, onConfirm, trigger = null }) {
  const t = useTranslations('Plans')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState(tenant.subscriptionPlan)
  const [expiresAt, setExpiresAt] = useState(toDateInput(tenant.subscriptionExpiresAt))

  // Réinitialisé à l'ouverture plutôt que dans un effet : le formulaire doit
  // repartir de l'état actuel, pas d'une saisie abandonnée.
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setPlan(tenant.subscriptionPlan)
      setExpiresAt(toDateInput(tenant.subscriptionExpiresAt))
    }
  }

  const selected = plans.find((item) => item.name === plan)
  const initialExpiry = toDateInput(tenant.subscriptionExpiresAt)
  const unchanged = plan === tenant.subscriptionPlan && expiresAt === initialExpiry

  const handleSubmit = async (event) => {
    event.preventDefault()
    // Champ vidé = abonnement sans échéance, ce qui n'est pas « inchangé ».
    const succeeded = await onConfirm(plan, expiresAt ? new Date(expiresAt).toISOString() : null)
    if (succeeded) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm" disabled={loading}>{t('changePlan')}</Button>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('planOf', { name: tenant.name })}</DialogTitle>
            <DialogDescription>
              {t('limitsApplyNow')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-plan">{t('planLabel')}</Label>
              <Select value={plan} onValueChange={setPlan} disabled={loading}>
                <SelectTrigger id="tenant-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.label} — {formatPrice(item.priceAmount, item.priceCurrency, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{describePlan(selected, t)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-expiry">{t('subscriptionExpiry')}</Label>
              <Input
                id="tenant-expiry"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('expiryHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={loading || unchanged}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
