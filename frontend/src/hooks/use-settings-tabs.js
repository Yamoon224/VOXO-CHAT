'use client'

import { useMemo } from 'react'
import { usePermissions } from '@/hooks/use-permissions'

/**
 * Onglets visibles des réglages, et lesquels sont en lecture seule.
 *
 * Deux règles distinctes :
 *  - `resource` masque l'onglet quand l'accès est « aucun » ;
 *  - `readOnly` le laisse visible mais grisé quand l'accès est « lecture ».
 *
 * Équipe, Facturation et Canaux ont quitté les réglages pour devenir des pages
 * à part entière : leurs droits sont décrits par `NAV_ITEMS` et appliqués par
 * `RouteGuard`. Aucun onglet restant n'étant gouverné par le rôle, le filtre
 * correspondant a disparu d'ici — le décrire à deux endroits laisserait les
 * deux diverger.
 */
const TABS = [
  { value: 'chatbot', resource: 'company', writable: true },
  { value: 'testing', resource: 'company', writable: false },
  { value: 'profile', resource: null, writable: false },
  { value: 'company', resource: 'company', writable: true },
]

export function useSettingsTabs() {
  const { canRead, canWrite, ready } = usePermissions()

  return useMemo(() => {
    if (!ready) return { visible: new Set(), isReadOnly: () => true, ready }

    const visible = new Set(
      TABS
        .filter(tab => !tab.resource || canRead(tab.resource))
        .map(tab => tab.value)
    )

    const readOnly = new Set(
      TABS
        .filter(tab => tab.writable && tab.resource && !canWrite(tab.resource))
        .map(tab => tab.value)
    )

    return {
      visible,
      isVisible: value => visible.has(value),
      isReadOnly: value => readOnly.has(value),
      ready,
    }
  }, [canRead, canWrite, ready])
}
