'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { PermissionsMatrixFields } from '@/components/team/PermissionsMatrixFields'

/**
 * Ajuste les accès d'un membre, ressource par ressource.
 *
 * Un dialogue plutôt qu'une colonne du tableau : quatre ressources sur trois
 * niveaux ne tiennent pas dans une cellule, et cela permet de réutiliser
 * exactement le même corps de formulaire qu'à l'invitation.
 *
 * L'état part des surcharges enregistrées, et il est remis à celles-ci à
 * chaque ouverture pour qu'un abandon ne laisse aucune trace.
 */
export function MemberPermissionsDialog({ member, loading, onConfirm }) {
  const t = useTranslations('Team')
  const [open, setOpen] = useState(false)
  const [permissions, setPermissions] = useState(member.permissionOverrides || {})

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) setPermissions(member.permissionOverrides || {})
  }

  const handleConfirm = async () => {
    const succeeded = await onConfirm(member.id, permissions)
    if (succeeded) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('editAccessAriaLabel', { email: member.email })}>
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('accessOf', { firstName: member.firstName, lastName: member.lastName })}</DialogTitle>
          <DialogDescription>
            {t('accessDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <PermissionsMatrixFields
          role={member.role}
          value={permissions}
          onChange={setPermissions}
          disabled={loading}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
