'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConversationEmailExportDialog({ open, onOpenChange, recipients, exporting, onSend }) {
  const t = useTranslations('Conversations')
  const [recipient, setRecipient] = useState(recipients[0] || '')
  const submit = async () => { if (recipient && await onSend(recipient)) onOpenChange(false) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>{t('emailExportTitle')}</DialogTitle><DialogDescription>{t('emailExportDescription')}</DialogDescription></DialogHeader>
    {recipients.length ? <Select value={recipient} onValueChange={setRecipient}><SelectTrigger><SelectValue placeholder={t('emailExportChoose')} /></SelectTrigger><SelectContent>{recipients.map(email => <SelectItem key={email} value={email}>{email}</SelectItem>)}</SelectContent></Select> : <p className="text-sm text-muted-foreground">{t('emailExportNoRecipients')}</p>}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button><Button disabled={!recipient || exporting} onClick={submit}>{exporting ? t('sending') : t('send')}</Button></DialogFooter>
  </DialogContent></Dialog>
}
