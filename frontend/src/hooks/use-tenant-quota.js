'use client'

import { useCallback, useEffect, useState } from 'react'
import { tenantAPI } from '@/lib/api'

/**
 * Consommation et limites réelles de l'entreprise connectée.
 *
 * Seule source autorisée pour afficher un quota : les valeurs écrites en dur
 * dans l'interface étaient fausses (elles annonçaient des limites que le
 * backend n'appliquait pas) et ne suivaient aucune édition de forfait.
 *
 * Volontairement silencieux en cas d'échec : ces chiffres décorent la coquille
 * du tableau de bord, une panne ne doit pas y afficher une alerte.
 */
export function useTenantQuota(enabled = true) {
  const [quota, setQuota] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadQuota = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await tenantAPI.getQuota()
      setQuota(response.data)
    } catch {
      setQuota(null)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    loadQuota()
  }, [loadQuota])

  return { quota, loading, reload: loadQuota }
}
