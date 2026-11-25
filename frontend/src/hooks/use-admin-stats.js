'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminStatsAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'
import { STATS_PERIODS } from '@/lib/stats-periods.mjs'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

// Réexporté pour ne pas casser les importateurs existants ; la liste vit
// désormais dans `lib/stats-periods.mjs`, partagée avec le tableau de bord.
export { STATS_PERIODS }

/** Lecture seule : ce module n'expose aucune écriture, donc pas de `runAction`. */
export function useAdminStats(enabled = true) {
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)

  const loadStats = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminStatsAPI.getStats(period)
      setStats(response.data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, period, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])
  const autoRefresh = useAutoRefresh(loadStats, 60000, { enabled, blocked: loading })

  return { stats, period, setPeriod, loading, reload: loadStats, ...autoRefresh }
}
