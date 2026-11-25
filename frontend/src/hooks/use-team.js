'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { teamAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function useTeam(enabled) {
  const t = useTranslations('Team')
  const { toast } = useToast()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ page: 1, search: '', role: '', status: 'active' })
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTeam = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await teamAPI.getMembers(filters)
      setMembers(response.data.members)
      setInvitations(response.data.invitations)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, filters, toast])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      await action()
      toast.success(successMessage)
      await loadTeam()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    members,
    invitations,
    pagination,
    filters,
    setFilters,
    loading,
    actionLoading,
    inviteMember: (data) => runAction(
      () => teamAPI.inviteMember(data),
      t('toastMemberInvited')
    ),
    resendInvitation: (id) => runAction(
      () => teamAPI.resendInvitation(id),
      t('toastInvitationResent')
    ),
    revokeInvitation: (id) => runAction(
      () => teamAPI.revokeInvitation(id),
      t('toastInvitationRevoked')
    ),
    updateRole: (id, role) => runAction(
      () => teamAPI.updateMemberRole(id, role),
      t('toastRoleUpdated')
    ),
    updatePermissions: (id, permissions) => runAction(
      () => teamAPI.updateMemberPermissions(id, permissions),
      t('toastPermissionsUpdated')
    ),
    setMemberStatus: (id, isActive) => runAction(
      () => teamAPI.setMemberStatus(id, isActive),
      isActive ? t('toastMemberUnblocked') : t('toastMemberBlocked')
    ),
    deleteMember: (id, currentPassword) => runAction(
      () => teamAPI.deleteMember(id, currentPassword),
      t('toastMemberDeleted')
    ),
  }
}
