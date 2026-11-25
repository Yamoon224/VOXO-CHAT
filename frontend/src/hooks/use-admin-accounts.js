'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminAccountAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'

export function useAdminAccounts(enabled) {
  const { toast } = useToast()
  const [admins, setAdmins] = useState([])
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ page: 1, search: '', roleId: '', status: 'active' })
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadAdmins = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminAccountAPI.getAdmins(filters)
      setAdmins(response.data.admins)
      setInvitations(response.data.invitations)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, filters, toast])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      await action()
      toast.success(successMessage)
      await loadAdmins()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    admins,
    invitations,
    pagination,
    filters,
    setFilters,
    loading,
    actionLoading,
    inviteAdmin: (data) => runAction(
      () => adminAccountAPI.inviteAdmin(data),
      'Invitation envoyée avec succès'
    ),
    resendInvitation: (id) => runAction(
      () => adminAccountAPI.resendInvitation(id),
      'Invitation renvoyée avec succès'
    ),
    revokeInvitation: (id) => runAction(
      () => adminAccountAPI.revokeInvitation(id),
      'Invitation révoquée avec succès'
    ),
    updateAdminRole: (id, roleId) => runAction(
      () => adminAccountAPI.updateAdminRole(id, roleId),
      'Rôle mis à jour avec succès'
    ),
    setAdminStatus: (id, isActive) => runAction(
      () => adminAccountAPI.setAdminStatus(id, isActive),
      isActive ? 'Compte débloqué avec succès' : 'Compte bloqué avec succès'
    ),
  }
}
