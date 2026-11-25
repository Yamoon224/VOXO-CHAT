'use client'

import { Lock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/**
 * `canWrite` pilote l'ensemble des mutations : sans lui, la liste reste
 * consultable mais tout est figé. Le backend applique la même règle.
 */
export function AdminAccountsTable({
  actor, admins, roles, loading, canWrite, canAssignSystemRole, onRoleChange, onStatusChange,
}) {
  if (!loading && admins.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aucun compte trouvé.</p>
  }

  const assignableRoles = canAssignSystemRole ? roles : roles.filter(role => !role.isSystem)

  return (
    <div className="divide-y rounded-md border">
      {admins.map((admin) => {
        const isSelf = admin.id === actor?.id
        // Réattribuer un compte super administrateur suppose d'en être un.
        const canEditRole = canWrite && (!admin.isSystemRole || canAssignSystemRole)

        return (
          <div key={admin.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{admin.firstName} {admin.lastName}</span>
                {admin.isSystemRole && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" />Super admin
                  </Badge>
                )}
                {!admin.isActive && <Badge variant="destructive" className="text-xs">Bloqué</Badge>}
                {isSelf && <Badge variant="outline" className="text-xs">Vous</Badge>}
              </div>
              <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
            </div>

            <div className="flex items-center gap-2">
              {canEditRole ? (
                <Select
                  value={admin.roleId}
                  onValueChange={(roleId) => onRoleChange(admin.id, roleId)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-[180px]" aria-label={`Rôle de ${admin.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="gap-1">
                  {!canWrite && <Lock className="h-3 w-3" />}
                  {admin.roleName}
                </Badge>
              )}

              {/* Bloquer son propre compte enfermerait l'utilisateur dehors. */}
              {canWrite && !isSelf && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => onStatusChange(admin.id, !admin.isActive)}
                >
                  {admin.isActive ? 'Bloquer' : 'Débloquer'}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
