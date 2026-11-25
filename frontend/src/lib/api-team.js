import apiClient from '@/lib/api'

export const teamAPI = {
  getMembers: (params = {}) => apiClient.get('/team/members', { params }),
  inviteMember: (data) => apiClient.post('/team/invitations', data),
  resendInvitation: (id) => apiClient.post(`/team/invitations/${id}/resend`),
  revokeInvitation: (id) => apiClient.delete(`/team/invitations/${id}`),
  updateMemberRole: (id, role) => apiClient.patch(`/team/members/${id}/role`, { role }),
  // Accès par ressource : un envoi vide remet le membre sur le préréglage du rôle.
  updateMemberPermissions: (id, permissions) =>
    apiClient.patch(`/team/members/${id}/permissions`, { permissions }),
  // Blocage réversible, distinct de la suppression qui déclenche la purge à 30 jours.
  setMemberStatus: (id, isActive) => apiClient.patch(`/team/members/${id}/status`, { isActive }),
  deleteMember: (id, currentPassword) => apiClient.delete(`/team/members/${id}`, {
    data: { currentPassword },
  }),
  acceptInvitation: (data) => apiClient.post('/auth/invitations/accept', data),
}
