'use client'

import { useBilling } from '@/hooks/use-billing'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/hooks/use-auth'
import { RouteGuard } from '@/components/common/RouteGuard'
import { BillingTab } from '@/components/billing/BillingTab'

const ROLES = ['owner', 'admin']

/**
 * Forfait et demandes de changement.
 *
 * `useBilling` prend un drapeau d'activation : il ne doit pas appeler
 * `/tenant/plans` ni `/support/tickets` pour un membre qui n'y a pas droit.
 * L'appel est donc conditionné au rôle, en plus du `RouteGuard` qui masque
 * l'affichage — le garde visuel n'empêcherait pas la requête de partir.
 */
export default function BillingPage() {
  const { user } = useAuth()
  const { ready } = usePermissions()
  const allowed = ready && ROLES.includes(user?.role)
  const billing = useBilling(allowed)

  return (
    <RouteGuard roles={ROLES}>
      <BillingTab billing={billing} />
    </RouteGuard>
  )
}
