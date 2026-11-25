'use client'

import { useMemo } from 'react'
import useAdminAuthStore from '@/stores/admin-auth-store'
import { hasPermission } from '@/lib/admin-permissions.mjs'

/**
 * Accès effectifs de l'administrateur connecté, pour ajuster l'interface.
 *
 * `ready` reflète `isInitialized` : tant qu'il est faux, l'état vient du
 * localStorage et peut être périmé. RÈGLE : quand `ready` est faux, ne rien
 * afficher — jamais la branche permissive.
 */
export function useAdminPermissions() {
  const admin = useAdminAuthStore(state => state.admin)
  const isInitialized = useAdminAuthStore(state => state.isInitialized)

  const permissions = useMemo(() => admin?.permissions ?? {}, [admin])

  return useMemo(() => ({
    permissions,
    ready: isInitialized,
    isSystemRole: Boolean(admin?.role?.isSystem),
    can: (resource, level) => hasPermission(permissions, resource, level),
    canRead: resource => hasPermission(permissions, resource, 'read'),
    canWrite: resource => hasPermission(permissions, resource, 'write'),
  }), [permissions, isInitialized, admin])
}
