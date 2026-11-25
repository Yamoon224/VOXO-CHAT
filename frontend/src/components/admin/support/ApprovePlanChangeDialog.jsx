'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export function ApprovePlanChangeDialog({ ticket, loading, onApprove }) {
  const t = useTranslations('AdminSupport')
  const [open, setOpen] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const approve = async (event) => {
    event.preventDefault()
    if (await onApprove(new Date(`${expiresAt}T23:59:59.999Z`).toISOString())) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" disabled={loading}>{t('approvePlan')}</Button></DialogTrigger>
      <DialogContent>
        <form onSubmit={approve}>
          <DialogHeader>
            <DialogTitle>{t('approvePlanTitle', { plan: ticket.requestedPlan })}</DialogTitle>
            <DialogDescription>{t('approvePlanDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="plan-change-expiry">{t('expiryDate')}</Label>
            <Input id="plan-change-expiry" type="date" value={expiresAt} required min={new Date().toISOString().slice(0, 10)}
              onChange={event => setExpiresAt(event.target.value)} className="mt-2" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={loading || !expiresAt}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
