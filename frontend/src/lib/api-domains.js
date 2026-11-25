import apiClient from '@/lib/api'

export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data, { timeout: 150000 }),
  login: (data) => apiClient.post('/auth/login', data, { timeout: 1500000 }),
  getProfile: () => apiClient.get('/auth/profile', { timeout: 150000 }),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  uploadAvatar: (file) => {
    const body = new FormData()
    body.append('file', file)
    return apiClient.post('/auth/profile/avatar', body)
  },
  changePassword: (data) => apiClient.put('/auth/change-password', data),
  logout: () => apiClient.post('/auth/logout', {}, { timeout: 5000 }),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email) => apiClient.post('/auth/resend-verification', { email }),
  // Suppression de son propre compte : le backend décide seul si l'entreprise
  // part avec, d'où le preview consulté avant toute confirmation.
  getDeletionPreview: () => apiClient.get('/auth/account/deletion-preview'),
  deleteAccount: (data) => apiClient.delete('/auth/account', { data, timeout: 30000 }),
}

export const chatAPI = {
  sendMessage: (data) => apiClient.post('/chat/message', data, { timeout: 30000 }),
  getConversationHistory: (id, params = {}) => apiClient.get(`/chat/conversation/${id}`, {
    params,
    timeout: 500000,
  }),
  getConversations: (params = {}) => apiClient.get('/chat/conversations', {
    params,
    timeout: 60000,
  }),
  endConversation: (id, data = {}) => apiClient.post(`/chat/conversation/${id}/end`, data),
  updateConversationTitle: (id, title) => apiClient.patch(`/chat/conversation/${id}/title`, { title }),
  updateConversationPriority: (id, value) => apiClient.patch(`/chat/conversation/${id}/priority`, { value }),
  getConversationLabels: () => apiClient.get('/chat/conversation-labels'),
  createConversationLabel: (data) => apiClient.post('/chat/conversation-labels', data),
  updateConversationLabel: (id, data) => apiClient.patch(`/chat/conversation-labels/${id}`, data),
  deleteConversationLabel: (id) => apiClient.delete(`/chat/conversation-labels/${id}`),
  assignConversationLabels: (id, labelIds) => apiClient.put(`/chat/conversation/${id}/labels`, { labelIds }),
  markConversationRead: (id) => apiClient.post(`/chat/conversation/${id}/read`),
  downloadConversationPdf: (id) => apiClient.get(`/chat/conversation/${id}/export`, { responseType: 'blob' }),
  downloadSelectedConversations: (sessionIds, format) => apiClient.post('/chat/conversations/export', { sessionIds, format }, { responseType: 'blob' }),
  emailConversationPdf: (id, recipient) => apiClient.post(`/chat/conversation/${id}/email-export`, { recipient }),
  takeConversation: (id) => apiClient.post(`/chat/conversation/${id}/take`),
  returnConversationToAi: (id) => apiClient.post(`/chat/conversation/${id}/return-to-ai`),
  sendAgentMessage: (id, content, internal = false, attachment = null, clientMessageId) => {
    if (!attachment) return apiClient.post(`/chat/conversation/${id}/agent-message`, { content, internal, clientMessageId })
    const body = new FormData()
    body.append('content', content)
    body.append('internal', String(internal))
    body.append('clientMessageId', clientMessageId)
    body.append('file', attachment)
    return apiClient.post(`/chat/conversation/${id}/agent-message`, body)
  },
  // URL signée de courte durée vers une pièce jointe reçue
  getAttachmentUrl: (attachmentId) => apiClient.get(`/chat/attachments/${attachmentId}/url`),
  updateCommercialRequest: (id, data) => apiClient.patch(`/chat/commercial-requests/${id}`, data),
}

export const analyticsAPI = {
  // La période borne les tuiles autant que le graphique : le backend applique
  // la même fenêtre aux deux.
  getDashboardStats: (period = '30d') => apiClient.get(`/analytics/dashboard?period=${period}`),
  getDetailedStats: () => apiClient.get('/analytics/detailed'),
}

export const tenantAPI = {
  getProfile: () => apiClient.get('/tenant/profile'),
  // Consommation et limites réelles du forfait : c'est la seule source pour
  // l'affichage des quotas, aucune valeur ne doit être écrite en dur côté client.
  getQuota: () => apiClient.get('/tenant/quota'),
  getPlans: () => apiClient.get('/tenant/plans'),
  requestPlanChange: (data) => apiClient.post('/tenant/billing/plan-change-requests', data),
  updateBillingCurrency: (currency) => apiClient.put('/tenant/billing/currency', { currency }),
  updateSettings: (settings) => apiClient.put('/tenant/settings', settings),
  updateAllowedDomains: (settings) => apiClient.put('/tenant/allowed-domains', settings),
  updateAllowedApps: (settings) => apiClient.put('/tenant/allowed-apps', settings),
  getMobilePush: () => apiClient.get('/tenant/mobile-push'),
  updateMobilePush: (settings) => apiClient.put('/tenant/mobile-push', settings),
  getConversationExportSettings: () => apiClient.get('/tenant/conversation-export-settings'),
  updateConversationExportSettings: (allowedRecipients) => apiClient.put('/tenant/conversation-export-settings', { allowedRecipients }),
  listAgentActions: () => apiClient.get('/tenant/agent-actions'),
  createAgentAction: (payload) => apiClient.post('/tenant/agent-actions', payload),
  updateAgentAction: (id, payload) => apiClient.put(`/tenant/agent-actions/${id}`, payload),
  deleteAgentAction: (id) => apiClient.delete(`/tenant/agent-actions/${id}`),
  testAgentAction: (id, args) => apiClient.post(`/tenant/agent-actions/${id}/test`, { arguments: args }),
  getAgentUsage: (params) => apiClient.get('/tenant/agent-actions/usage', { params }),
  updateAgenticSettings: (enabled) => apiClient.put('/tenant/agent-actions/settings', { enabled }),
}

export const integrationAPI = {
  list: () => apiClient.get('/integrations'),
  save: (data) => apiClient.post('/integrations', data),
  startMicrosoft: (data) => apiClient.post('/integrations/microsoft/authorize', data),
  sync: (id) => apiClient.post(`/integrations/${id}/sync`),
  jobs: (id) => apiClient.get(`/integrations/${id}/jobs`),
  disconnect: (id) => apiClient.delete(`/integrations/${id}`),
}

export const supportAPI = {
  getTickets: () => apiClient.get('/tenant/support'),
  getTicket: (id) => apiClient.get(`/tenant/support/${id}`),
  createTicket: (data) => apiClient.post('/tenant/support', data),
  // `clientMessageId` rend l'envoi idempotent : un renvoi après échec réseau
  // ne duplique pas le message.
  reply: (id, content, clientMessageId) =>
    apiClient.post(`/tenant/support/${id}/messages`, { content, clientMessageId }),
}

export const webhookAPI = {
  getChannelsStatus: (id) => apiClient.get(`/webhooks/channels/${id}/status`),
  testTelegram: (id, botToken) => apiClient.post(`/webhooks/telegram/${id}/test`, { botToken }),
  registerTelegram: (id, botToken) => apiClient.post(
    `/webhooks/telegram/${id}/register`,
    { botToken }
  ),
  deleteTelegram: (id) => apiClient.delete(`/webhooks/telegram/${id}/webhook`),
    testWhatsApp: (id, settings) => apiClient.post(
      `/webhooks/whatsapp/${id}/test`,
      settings
    ),
    registerWhatsApp: (id, settings) => apiClient.post(
      `/webhooks/whatsapp/${id}/register`,
      settings
  ),
  deleteWhatsApp: (id) => apiClient.delete(`/webhooks/whatsapp/${id}/webhook`),
}
