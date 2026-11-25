'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * Le sélecteur de rôle est peuplé depuis la base : les rôles étant créés par
 * les super administrateurs, aucune liste figée ne peut faire foi ici.
 *
 * `canAssignSystemRole` masque le rôle système pour un compte qui n'en fait pas
 * partie — le backend refuserait de toute façon, mais proposer un choix voué à
 * l'échec serait un piège.
 */
export function InviteAdminDialog({ roles, loading, canAssignSystemRole, onInvite }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')

  const assignableRoles = canAssignSystemRole ? roles : roles.filter(role => !role.isSystem)

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setEmail('')
      setRoleId('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const succeeded = await onInvite({ email: email.trim(), roleId })
    if (succeeded) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="mr-2 h-4 w-4" />Inviter un administrateur</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Inviter un administrateur</DialogTitle>
            <DialogDescription>
              Un lien de création de compte, valable 72 heures, lui sera envoyé par email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-admin-email">Email</Label>
              <Input
                id="invite-admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-admin-role">Rôle</Label>
              <Select value={roleId} onValueChange={setRoleId} disabled={loading}>
                <SelectTrigger id="invite-admin-role">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || !email.trim() || !roleId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
