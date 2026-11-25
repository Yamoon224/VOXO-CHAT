'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTranslations } from 'next-intl'

/**
 * Blocage et déblocage d'une entreprise.
 *
 * Le blocage déconnecte les webhooks Telegram/WhatsApp chez les fournisseurs :
 * l'avertissement est explicite, car la reconnexion incombera ensuite au client
 * et n'est pas automatique au déblocage.
 */
export function BlockTenantDialog({ tenant, loading, onConfirm, trigger = null }) {
  const t = useTranslations('AdminTenants')
  const [open, setOpen] = useState(false)
  const willBlock = tenant.isActive

  const handleConfirm = async () => {
    const succeeded = await onConfirm(!willBlock)
    if (succeeded) setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant={willBlock ? 'outline' : 'default'} size="sm" disabled={loading}>
            {willBlock ? t('block') : t('unblock')}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {willBlock ? t('blockTitle', { name: tenant.name }) : t('unblockTitle', { name: tenant.name })}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {willBlock ? (
              <div className="space-y-2">
                <p>{t('blockDescription')}</p>
                <p className="font-medium text-amber-700">{t('blockChannels')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>{t('unblockDescription')}</p>
                <p>{t('unblockChannels')}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
          <Button
            variant={willBlock ? 'destructive' : 'default'}
            disabled={loading}
            onClick={handleConfirm}
          >
            {willBlock ? t('blockCompany') : t('unblockCompany')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
