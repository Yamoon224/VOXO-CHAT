'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SUPPORT_REASONS } from '@/lib/support.mjs'

export function NewTicketDialog({ loading, onCreate }) {
  const t = useTranslations('Support')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ message: '', reason: '', otherReason: '' })

  // Réinitialisé à l'ouverture plutôt que dans un effet : la règle ESLint
  // `react-hooks/set-state-in-effect` est active sur ce dépôt.
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) setForm({ message: '', reason: '', otherReason: '' })
  }

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const succeeded = await onCreate({
      message: form.message.trim(),
      reason: form.reason,
      ...(form.reason === 'other' && { otherReason: form.otherReason.trim() }),
    })
    if (succeeded) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />{t('newRequest')}</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('contactTitle')}</DialogTitle>
            <DialogDescription>
              {t('contactDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-reason">{t('reasonLabel')}</Label>
              <Select value={form.reason} onValueChange={(value) => setField('reason', value)} disabled={loading}>
                <SelectTrigger id="ticket-reason"><SelectValue placeholder={t('reasonPlaceholder')} /></SelectTrigger>
                <SelectContent>{SUPPORT_REASONS.map((reason) => <SelectItem key={reason} value={reason}>{t(`reasons.${reason}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {form.reason === 'other' && <div className="space-y-2">
              <Label htmlFor="ticket-other-reason">{t('otherReasonLabel')}</Label>
              <Input id="ticket-other-reason" value={form.otherReason} onChange={(event) => setField('otherReason', event.target.value)} maxLength={120} minLength={3} required placeholder={t('otherReasonPlaceholder')} />
            </div>}

            <div className="space-y-2">
              <Label htmlFor="ticket-message">{t('messageLabel')}</Label>
              <Textarea
                id="ticket-message"
                value={form.message}
                onChange={(event) => setField('message', event.target.value)}
                placeholder={t('messagePlaceholder')}
                rows={6}
                maxLength={5000}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button
              type="submit"
              disabled={loading || !form.message.trim() || !form.reason || (form.reason === 'other' && form.otherReason.trim().length < 3)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
