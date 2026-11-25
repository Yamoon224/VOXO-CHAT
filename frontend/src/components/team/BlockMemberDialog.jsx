'use client'

import { useTranslations } from 'next-intl'
import { Ban, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * Blocage / déblocage d'un membre : action réversible, sans destruction de
 * données — à ne pas confondre avec DeleteMemberDialog.
 */
export function BlockMemberDialog({ member, loading, onConfirm }) {
  const t = useTranslations('Team')
  const blocking = member.isActive
  const label = blocking ? t('block') : t('unblock')

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${label} ${member.email}`}>
          {blocking
            ? <Ban className="text-amber-600" />
            : <CircleCheck className="text-green-600" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('blockConfirmTitle', { label })}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocking
              ? t('blockConfirmDescription', { firstName: member.firstName, lastName: member.lastName })
              : t('unblockConfirmDescription', { firstName: member.firstName, lastName: member.lastName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => onConfirm(member.id, !member.isActive)}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
