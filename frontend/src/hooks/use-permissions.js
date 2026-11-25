'use client'

import { useMemo } from 'react'
import useAuthStore from '@/stores/auth-store'
import {
  computeEffectivePermissions,
  hasPermission,
} from '@/lib/permissions.mjs'

/**
 * Accès effectifs du membre connecté, pour ajuster l'interface.
 *
 * Le backend les envoie déjà dans `user.permissions` (injectés par son
 * `toJSON`) ; le calcul local ne sert que de repli si la charge utile date
 * d'avant le déploiement.
 *
 * `ready` reflète `isInitialized` : tant qu'il est faux, l'état vient du
 * localStorage et peut être périmé. RÈGLE : quand `ready` est faux, ne rien
 * afficher — jamais la branche permissive.
 */
export function usePermissions() {
  const user = useAuthStore(state => state.user)
  const isInitialized = useAuthStore(state => state.isInitialized)

  const permissions = useMemo(
    () => user?.permissions ?? computeEffectivePermissions(user),
    [user]
  )

  return useMemo(() => ({
    permissions,
    ready: isInitialized,
    can: (resource, level) => hasPermission(permissions, resource, level),
    canRead: resource => hasPermission(permissions, resource, 'read'),
    canWrite: resource => hasPermission(permissions, resource, 'write'),
  }), [permissions, isInitialized])
}
