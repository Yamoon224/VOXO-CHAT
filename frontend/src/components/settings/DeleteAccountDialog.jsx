'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAccountDeletion } from '@/hooks/use-account-deletion'
import { CompanyDeletionWarning } from '@/components/settings/CompanyDeletionWarning'

export function DeleteAccountDialog({ onDeleted }) {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newOwnerId, setNewOwnerId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const { preview, loading, submitting, error, submit } = useAccountDeletion(open)

  const transferRequired = preview?.transferRequired
  const willDeleteCompany = preview?.willDeleteCompany
  const blocked = !currentPassword
    || (transferRequired && !newOwnerId)
    || (willDeleteCompany && !confirmed)

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) return
    setCurrentPassword('')
    setNewOwnerId('')
    setConfirmed(false)
  }

  const handleConfirm = async () => {
    const result = await submit({
      currentPassword,
      ...(transferRequired && { newOwnerId }),
      ...(willDeleteCompany && { confirmCompanyDeletion: true }),
    })
    if (result.success) onDeleted?.()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer mon compte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Supprimer votre compte ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Votre compte sera supprimé immédiatement : vous ne pourrez plus vous connecter.
            Vos données seront effacées définitivement sous 30 jours. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Analyse de votre compte…</p>
        ) : (
          <div className="space-y-4 py-2">
            {transferRequired && (
              <div className="space-y-2">
                <Label htmlFor="new-owner">Nouveau propriétaire</Label>
                <p className="text-sm text-muted-foreground">
                  Votre équipe doit rester sous la responsabilité de quelqu’un : désignez le
                  membre qui reprendra {preview.tenantName}.
                </p>
                <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                  <SelectTrigger id="new-owner"><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
                  <SelectContent>
                    {preview.eligibleOwners.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} — {member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {willDeleteCompany && (
              <CompanyDeletionWarning
                tenantName={preview.tenantName}
                impact={preview.impact}
                confirmed={confirmed}
                onConfirmedChange={setConfirmed}
                disabled={submitting}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-current-password">Mot de passe actuel</Label>
              <Input
                id="delete-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={blocked || loading || submitting}
          >
            {submitting ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
