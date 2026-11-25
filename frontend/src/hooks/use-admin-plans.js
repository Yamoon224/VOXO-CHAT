'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminPlanAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'

export function useAdminPlans(enabled = true) {
  const { toast } = useToast()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadPlans = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminPlanAPI.getPlans()
      setPlans(response.data.plans)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, toast])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const updatePlan = async (id, data) => {
    setActionLoading(true)
    try {
      await adminPlanAPI.updatePlan(id, data)
      toast.success('Forfait mis à jour avec succès')
      await loadPlans()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const createPlan = async (data) => {
    setActionLoading(true)
    try { await adminPlanAPI.createPlan(data); toast.success('Forfait créé avec succès'); await loadPlans(); return true } catch (error) { toast.error(error.message); return false } finally { setActionLoading(false) }
  }

  return { plans, loading, actionLoading, reload: loadPlans, updatePlan, createPlan }
}
