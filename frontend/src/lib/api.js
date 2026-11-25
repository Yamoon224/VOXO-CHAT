// frontend/src/lib/api.js - Instance axios partagée et intercepteurs d'authentification
import axios from 'axios'
import Cookies from 'js-cookie'
import { getFrontendUrl } from '@/lib/app-url'
import { clearAuthCookies, isTokenExpiring, setAuthTokens } from '@/lib/auth-tokens'
import { isFormDataBody, removeJsonContentType } from './multipart.mjs'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise = null
let redirectingToLogin = false

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/refresh-token',
]

const isPublicAuthRequest = (url = '') => PUBLIC_AUTH_PATHS.some((path) => url.includes(path))

function clearSessionAndRedirect() {
  clearAuthCookies()

  if (typeof window === 'undefined') return
  window.localStorage.removeItem('auth-storage')

  if (!redirectingToLogin) {
    redirectingToLogin = true
    window.location.href = getFrontendUrl('/auth/login')
  }
}

// Refresh partagé : tous les appels concurrents attendent la même promesse.
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const currentRefreshToken = Cookies.get('refreshToken')
  if (!currentRefreshToken) {
    throw new Error('Refresh token absent')
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken: currentRefreshToken }, { timeout: 10000 })
    .then((response) => {
      const tokens = response.data.data.tokens
      setAuthTokens(tokens)
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

// Conserve le code métier du backend (ex: TOKEN_EXPIRED) que le rejet en Error simple perdrait.
// `details` transporte le contexte structuré, ex: la liste des conflits d'une inscription.
function toApiError(error) {
  const apiError = new Error(getErrorMessage(error))
  apiError.code = error.response?.data?.code
  apiError.details = error.response?.data?.details
  apiError.status = error.response?.status
  return apiError
}

apiClient.interceptors.request.use(
  async (config) => {
    config.headers['Accept-Language'] = Cookies.get('NEXT_LOCALE') || 'fr'
    if (isFormDataBody(config.data)) {
      removeJsonContentType(config.headers)
    }

    let token = Cookies.get('accessToken')

    // Refresh proactif : évite de consommer un 401 quand le jeton expire dans la minute.
    if (!isPublicAuthRequest(config.url) && (!token || isTokenExpiring(token))) {
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

    const tenantId = Cookies.get('tenantId')
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }

    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config || {}

    // Un seul retry par requête, adossé au refresh partagé entre tous les appels concurrents.
    if (error.response?.status === 401
      && !originalRequest._retry
      && !isPublicAuthRequest(originalRequest.url)) {
      originalRequest._retry = true

      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch {
        clearSessionAndRedirect()
        return Promise.reject(new Error('Session expirée, veuillez vous reconnecter'))
      }
    }

    return Promise.reject(toApiError(error))
  }
)

export default apiClient

export { authAPI, chatAPI, analyticsAPI, tenantAPI, webhookAPI, supportAPI, integrationAPI } from '@/lib/api-domains'
export { knowledgeAPI } from '@/lib/api-knowledge'
export { teamAPI } from '@/lib/api-team'
export { checkBackendHealth, handleApiError, diagnoseProblem } from '@/lib/api-diagnostics'
