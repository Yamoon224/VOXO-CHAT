'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConversationBulkExportDialog({ open, onOpenChange, count, exporting, onExport }) {
  const t = useTranslations('Conversations')
  const [format, setFormat] = useState('csv')
  const submit = async () => { if (await onExport(format)) onOpenChange(false) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>{t('bulkExportTitle')}</DialogTitle><DialogDescription>{t('bulkExportDescription', { count })}</DialogDescription></DialogHeader>
    <Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
      <SelectItem value="csv">{t('bulkExportCsv')}</SelectItem><SelectItem value="zip">{t('bulkExportZip')}</SelectItem>
    </SelectContent></Select>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button><Button disabled={exporting} onClick={submit}>{exporting ? t('creating') : t('download')}</Button></DialogFooter>
  </DialogContent></Dialog>
}
