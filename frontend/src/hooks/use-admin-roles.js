'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminRoleAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'

export function useAdminRoles(enabled = true) {
  const { toast } = useToast()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadRoles = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminRoleAPI.getRoles()
      setRoles(response.data.roles)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, toast])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      await action()
      toast.success(successMessage)
      await loadRoles()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    roles,
    loading,
    actionLoading,
    reload: loadRoles,
    createRole: (data) => runAction(
      () => adminRoleAPI.createRole(data),
      'Rôle créé avec succès'
    ),
    updateRole: (id, data) => runAction(
      () => adminRoleAPI.updateRole(id, data),
      'Rôle mis à jour avec succès'
    ),
    deleteRole: (id) => runAction(
      () => adminRoleAPI.deleteRole(id),
      'Rôle supprimé avec succès'
    ),
  }
}
