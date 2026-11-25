'use client'

import { useState, useEffect, useCallback } from 'react'
import { analyticsAPI } from '@/lib/api'
import { STATS_PERIODS } from '@/lib/stats-periods.mjs'
import { useToast } from './use-toast'

export { STATS_PERIODS }

/**
 * Statistiques du tableau de bord, sur une fenêtre choisie.
 *
 * La période pilote TOUT ce que la page affiche — tuiles comprises, et pas
 * seulement le graphique : le backend borne désormais ses totaux sur la même
 * fenêtre. Un en-tête annonçant « 7 derniers jours » au-dessus de tuiles
 * cumulées depuis la création du compte aurait été trompeur.
 */
export function useAnalytics(initialPeriod = '30d') {
  const { toast } = useToast()
  const [period, setPeriod] = useState(initialPeriod)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await analyticsAPI.getDashboardStats(period)
      if (response.success) {
        setStats(response.data.stats)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err.message)
      toast.error('Impossible de charger les statistiques')
    } finally {
      setLoading(false)
    }
  }, [period, toast])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    period,
    setPeriod,
    loading,
    error,
    refresh: fetchStats
  }
}
