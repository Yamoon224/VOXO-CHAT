import axios from 'axios'
import Cookies from 'js-cookie'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function checkBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, { timeout: 5000 })
    return { accessible: true, data: response.data }
  } catch (error) {
    return { accessible: false, error: error.message }
  }
}

export function handleApiError(error) {
  const message = error.message || 'Une erreur est survenue'
  const suggestions = []
  if (message.includes('timeout')) suggestions.push('Réessayez dans quelques instants')
  if (message.includes('Network')) suggestions.push('Vérifiez que le backend est accessible')
  return { message, suggestions, originalError: error }
}

export async function diagnoseProblem() {
  const health = await checkBackendHealth()
  const diagnosis = {
    backendAccessible: health.accessible,
    authTokenPresent: Boolean(Cookies.get('accessToken')),
    tenantIdPresent: Boolean(Cookies.get('tenantId')),
    suggestions: [],
  }
  if (!diagnosis.backendAccessible) diagnosis.suggestions.push('Démarrez le serveur backend')
  if (!diagnosis.authTokenPresent) diagnosis.suggestions.push('Connectez-vous à nouveau')
  if (!diagnosis.tenantIdPresent) diagnosis.suggestions.push('Reconnectez votre compte au tenant')
  return diagnosis
}
