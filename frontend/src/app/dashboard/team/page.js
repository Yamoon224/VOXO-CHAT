'use client'

import { useAuth } from '@/hooks/use-auth'
import { RouteGuard } from '@/components/common/RouteGuard'
import { TeamTab } from '@/components/team/TeamTab'

/**
 * Gestion de l'équipe.
 *
 * Était un onglet des Paramètres. Gardée par RÔLE et non par ressource :
 * inviter un membre ou lui retirer ses accès n'est pas un niveau de lecture sur
 * une donnée, c'est une prérogative du propriétaire.
 */
export default function TeamPage() {
  const { user } = useAuth()

  return (
    <RouteGuard roles={['owner', 'admin']}>
      <TeamTab user={user} />
    </RouteGuard>
  )
}
