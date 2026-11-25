'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminPermissionsFields } from '@/components/admin/roles/AdminPermissionsFields'

/**
 * Création et édition d'un rôle partagent le même formulaire : seuls le titre,
 * les valeurs initiales et l'action diffèrent. Sans `role`, on crée.
 */
export function RoleFormDialog({ role = null, loading = false, onSubmit }) {
  const isEdit = Boolean(role)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState({})

  // Réinitialisé à l'ouverture plutôt que dans un effet : l'édition doit
  // toujours repartir des valeurs actuelles du rôle, pas d'une saisie annulée.
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setName(role?.name ?? '')
      setPermissions(role?.permissions ?? {})
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const succeeded = await onSubmit({ name: name.trim(), permissions })
    if (succeeded) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">Modifier</Button>
        ) : (
          <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nouveau rôle</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Modifier le rôle' : 'Créer un rôle'}</DialogTitle>
            <DialogDescription>
              Choisissez le niveau d’accès accordé à ce rôle sur chaque ressource.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nom du rôle</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Support, Facturation…"
                maxLength={40}
                required
              />
            </div>

            <AdminPermissionsFields
              value={permissions}
              onChange={setPermissions}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || name.trim().length < 2}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer le rôle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
