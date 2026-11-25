'use client'

import { Clock, RotateCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PendingAdminInvitations({ invitations, loading, canWrite, onResend, onRevoke }) {
  if (!invitations.length) return null

  return (
    <div className="space-y-3 border-t pt-5">
      <h3 className="font-medium">Invitations en attente</h3>
      {invitations.map((invitation) => {
        const expired = new Date(invitation.expiresAt) <= new Date()

        return (
          <div key={invitation.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{invitation.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{invitation.roleName}</Badge>
                <Clock className="h-3 w-3" />
                {expired
                  ? 'Expirée'
                  : `Expire le ${new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}`}
              </div>
            </div>

            {canWrite && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={loading} onClick={() => onResend(invitation.id)}>
                  <RotateCw />Renvoyer
                </Button>
                <Button variant="ghost" size="sm" disabled={loading} onClick={() => onRevoke(invitation.id)}>
                  <X />Révoquer
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
