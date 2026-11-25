'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * Suppression définitive d'un membre par le propriétaire. Le mot de passe est
 * exigé comme pour la suppression de son propre compte : l'action est
 * irréversible et le compte visé disparaît sous 30 jours.
 */
export function DeleteMemberDialog({ member, loading, onConfirm }) {
  const t = useTranslations('Team')
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (!nextOpen) setCurrentPassword('')
  }

  const handleConfirm = async () => {
    const succeeded = await onConfirm(member.id, currentPassword)
    if (succeeded) handleOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('deleteAriaLabel', { email: member.email })}>
          <Trash2 className="text-red-600" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmDescription', { firstName: member.firstName, lastName: member.lastName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`delete-member-password-${member.id}`}>{t('yourPassword')}</Label>
          <Input
            id={`delete-member-password-${member.id}`}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={loading}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={loading || !currentPassword}
            onClick={handleConfirm}
          >
            {loading ? t('deleting') : t('deletePermanently')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
