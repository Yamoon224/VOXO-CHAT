'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminTenantAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

export function useAdminTenants(enabled) {
  const { toast } = useToast()
  const [tenants, setTenants] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ page: 1, search: '', subscriptionPlan: '', status: 'all' })
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTenants = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminTenantAPI.getTenants(filters)
      setTenants(response.data.tenants)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, filters, toast])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])
  const autoRefresh = useAutoRefresh(loadTenants, 60000, { enabled, blocked: loading || actionLoading })

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      await action()
      toast.success(successMessage)
      await loadTenants()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    tenants,
    pagination,
    filters,
    setFilters,
    loading,
    actionLoading,
    reload: loadTenants,
    setTenantStatus: (id, isActive) => runAction(
      () => adminTenantAPI.setTenantStatus(id, isActive),
      isActive ? 'Entreprise débloquée avec succès' : 'Entreprise bloquée avec succès'
    ),
    ...autoRefresh,
    updateTenantPlan: (id, plan, expiresAt) => runAction(
      () => adminTenantAPI.updateTenantPlan(id, plan, expiresAt),
      'Forfait mis à jour avec succès'
    ),
  }
}

/** Fiche détaillée d'une entreprise, chargée séparément de la liste. */
export function useAdminTenantDetail(tenantId, enabled) {
  const { toast } = useToast()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTenant = useCallback(async () => {
    if (!enabled || !tenantId) return
    setLoading(true)
    try {
      const response = await adminTenantAPI.getTenant(tenantId)
      setTenant(response.data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, tenantId, toast])

  useEffect(() => {
    loadTenant()
  }, [loadTenant])

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      await action()
      toast.success(successMessage)
      await loadTenant()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    tenant,
    loading,
    actionLoading,
    setStatus: (isActive) => runAction(
      () => adminTenantAPI.setTenantStatus(tenantId, isActive),
      isActive ? 'Entreprise débloquée avec succès' : 'Entreprise bloquée avec succès'
    ),
    updatePlan: (plan, expiresAt) => runAction(
      () => adminTenantAPI.updateTenantPlan(tenantId, plan, expiresAt),
      'Forfait mis à jour avec succès'
    ),
  }
}
