// frontend/src/lib/api-admin.js — Client axios de la plateforme d'administration
//
// Instance SÉPARÉE de `lib/api.js`, volontairement : le client tenant attache
// systématiquement `X-Tenant-ID`, qui n'a aucun sens pour des routes
// transverses aux tenants, et les deux sessions utilisent des cookies distincts.
import axios from 'axios'
import Cookies from 'js-cookie'
import { getFrontendUrl } from '@/lib/app-url'
import {
  ADMIN_ACCESS_TOKEN,
  ADMIN_REFRESH_TOKEN,
  clearAdminAuthCookies,
  isAdminTokenExpiring,
  setAdminAuthTokens,
} from '@/lib/admin-auth-tokens'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise = null
let redirectingToLogin = false

const PUBLIC_ADMIN_PATHS = [
  '/admin/auth/login',
  '/admin/auth/refresh-token',
  '/admin/auth/invitations/accept',
]

const isPublicAdminRequest = (url = '') => PUBLIC_ADMIN_PATHS.some((path) => url.includes(path))

function clearSessionAndRedirect() {
  clearAdminAuthCookies()

  if (typeof window === 'undefined') return
  window.localStorage.removeItem('admin-auth-storage')

  if (!redirectingToLogin) {
    redirectingToLogin = true
    window.location.href = getFrontendUrl('/admin/auth/login')
  }
}

// Refresh partagé : tous les appels concurrents attendent la même promesse.
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const currentRefreshToken = Cookies.get(ADMIN_REFRESH_TOKEN)
  if (!currentRefreshToken) {
    throw new Error('Refresh token absent')
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/admin/auth/refresh-token`, { refreshToken: currentRefreshToken }, { timeout: 10000 })
    .then((response) => {
      const tokens = response.data.data.tokens
      setAdminAuthTokens(tokens)
      return tokens.accessToken
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

function getErrorMessage(error) {
  if (error.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre'
  if (error.code === 'ERR_NETWORK') return 'Impossible de se connecter au serveur'
  if (error.response?.data?.error) return error.response.data.error
  const messages = {
    400: 'Données invalides',
    403: 'Accès refusé',
    404: 'Ressource non trouvée',
    500: 'Erreur serveur interne',
    502: 'Serveur indisponible',
    503: 'Service temporairement indisponible',
  }
  return messages[error.response?.status] || error.message || 'Une erreur est survenue'
}

function toApiError(error) {
  const apiError = new Error(getErrorMessage(error))
  apiError.code = error.response?.data?.code
  apiError.details = error.response?.data?.details
  apiError.status = error.response?.status
  return apiError
}

adminClient.interceptors.request.use(
  async (config) => {
    config.headers['Accept-Language'] = Cookies.get('NEXT_LOCALE') || 'fr'
    let token = Cookies.get(ADMIN_ACCESS_TOKEN)

    // Refresh proactif : évite de consommer un 401 quand le jeton expire dans la minute.
    if (!isPublicAdminRequest(config.url) && (!token || isAdminTokenExpiring(token))) {
      try {
        token = await refreshAccessToken()
      } catch {
        clearSessionAndRedirect()
        return Promise.reject(new Error('Session expirée, veuillez vous reconnecter'))
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

adminClient.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config || {}

    if (error.response?.status === 401
      && !originalRequest._retry
      && !isPublicAdminRequest(originalRequest.url)) {
      originalRequest._retry = true

      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return adminClient(originalRequest)
      } catch {
        clearSessionAndRedirect()
        return Promise.reject(new Error('Session expirée, veuillez vous reconnecter'))
      }
    }

    return Promise.reject(toApiError(error))
  }
)

export default adminClient

export const adminAuthAPI = {
  login: (credentials) => adminClient.post('/admin/auth/login', credentials),
  logout: () => adminClient.post('/admin/auth/logout'),
  getProfile: () => adminClient.get('/admin/auth/profile'),
  updateLocale: (preferredLocale) => adminClient.patch('/admin/auth/profile/locale', { preferredLocale }),
  acceptInvitation: (data) => adminClient.post('/admin/auth/invitations/accept', data),
}

export const adminRoleAPI = {
  getRoles: () => adminClient.get('/admin/roles'),
  createRole: (data) => adminClient.post('/admin/roles', data),
  updateRole: (id, data) => adminClient.patch(`/admin/roles/${id}`, data),
  deleteRole: (id) => adminClient.delete(`/admin/roles/${id}`),
}

export const adminSupportAPI = {
  getTickets: (params = {}) => adminClient.get('/admin/support', { params }),
  // Compteur dédié : dépaginer la liste pour afficher un nombre serait absurde.
  getOpenCount: () => adminClient.get('/admin/support/count'),
  getStats: (period = '30d') => adminClient.get('/admin/support/stats', { params: { period } }),
  getTicket: (id) => adminClient.get(`/admin/support/${id}`),
  assign: (id, adminId = null) =>
    adminClient.patch(`/admin/support/${id}/assignment`, adminId ? { adminId } : {}),
  release: (id) => adminClient.delete(`/admin/support/${id}/assignment`),
  setStatus: (id, status) => adminClient.patch(`/admin/support/${id}/status`, { status }),
  approvePlanChange: (id, subscriptionExpiresAt) =>
    adminClient.post(`/admin/support/${id}/approve-plan-change`, { subscriptionExpiresAt }),
  // `internal: true` produit une note interne, jamais renvoyée au client.
  reply: (id, content, internal, clientMessageId) =>
    adminClient.post(`/admin/support/${id}/messages`, { content, internal, clientMessageId }),
}

export const adminStatsAPI = {
  // Un seul appel sert toutes les tuiles et graphiques : les agrégats
  // partagent la même fenêtre temporelle et ne peuvent pas se contredire.
  getStats: (period = '30d') => adminClient.get('/admin/stats', { params: { period } }),
}

export const adminPlanAPI = {
  getPlans: () => adminClient.get('/admin/plans'),
  createPlan: (data) => adminClient.post('/admin/plans', data),
  updatePlan: (id, data) => adminClient.patch(`/admin/plans/${id}`, data),
  archivePlan: (id) => adminClient.delete(`/admin/plans/${id}`),
}

export const adminTenantAPI = {
  getTenants: (params = {}) => adminClient.get('/admin/tenants', { params }),
  getTenant: (id) => adminClient.get(`/admin/tenants/${id}`),
  // Blocage réversible : coupe l'accès sans rien supprimer.
  setTenantStatus: (id, isActive) => adminClient.patch(`/admin/tenants/${id}/status`, { isActive }),
  // `subscriptionExpiresAt` absent = échéance inchangée ; `null` = sans échéance.
  updateTenantPlan: (id, subscriptionPlan, subscriptionExpiresAt) =>
    adminClient.patch(`/admin/tenants/${id}/plan`, {
      subscriptionPlan,
      ...(subscriptionExpiresAt !== undefined && { subscriptionExpiresAt }),
    }),
  getCredits: (id) => adminClient.get(`/admin/tenants/${id}/credits`),
  adjustCredits: (id, data) => adminClient.post(`/admin/tenants/${id}/credits`, data),
}

export const adminAccountAPI = {
  getAdmins: (params = {}) => adminClient.get('/admin/accounts', { params }),
  inviteAdmin: (data) => adminClient.post('/admin/accounts/invitations', data),
  resendInvitation: (id) => adminClient.post(`/admin/accounts/invitations/${id}/resend`),
  revokeInvitation: (id) => adminClient.delete(`/admin/accounts/invitations/${id}`),
  updateAdminRole: (id, roleId) => adminClient.patch(`/admin/accounts/${id}/role`, { roleId }),
  setAdminStatus: (id, isActive) => adminClient.patch(`/admin/accounts/${id}/status`, { isActive }),
}
