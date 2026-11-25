import { useLocale, useTranslations } from 'next-intl'
import { Clock, RotateCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { canManageInvitation } from '@/lib/team-permissions.mjs'
import { formatDateShort } from '@/lib/format.mjs'
import { PermissionsSummary } from '@/components/team/PermissionsSummary'

export function PendingInvitations({ actorRole, invitations, loading, onResend, onRevoke }) {
  const t = useTranslations('Team')
  const locale = useLocale()
  const roleLabels = { admin: t('roles.admin'), user: t('roles.user') }
  if (!invitations.length) return null
  return (
    <div className="space-y-3 border-t pt-5">
      <h3 className="font-medium">{t('pendingInvitations')}</h3>
      {invitations.map((invitation) => {
        const canManage = canManageInvitation({ role: actorRole }, invitation)
        const expired = new Date(invitation.expiresAt) <= new Date()
        return (
          <div key={invitation.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{invitation.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{roleLabels[invitation.role]}</Badge>
                <Clock className="h-3 w-3" />
                {expired ? t('invitationExpired') : t('invitationExpiresOn', { date: formatDateShort(invitation.expiresAt, locale) })}
              </div>
              {/* Accès en lecture seule : pour les changer, révoquer puis
                  réinviter — une invitation en attente ne s'édite pas. */}
              <div className="mt-2">
                <PermissionsSummary permissions={invitation.permissions} />
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={loading} onClick={() => onResend(invitation.id)}>
                  <RotateCw />{t('resend')}
                </Button>
                <Button variant="ghost" size="sm" disabled={loading} onClick={() => onRevoke(invitation.id)}>
                  <X />{t('revoke')}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
