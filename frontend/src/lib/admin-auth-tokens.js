import Cookies from 'js-cookie'

/**
 * Cookies de la plateforme d'administration, volontairement distincts de ceux
 * du dashboard tenant : les deux sessions peuvent coexister dans le même
 * navigateur sans jamais se recouvrir ni se déconnecter l'une l'autre.
 */
export const ADMIN_ACCESS_TOKEN = 'adminAccessToken'
export const ADMIN_REFRESH_TOKEN = 'adminRefreshToken'

function getJwtExpiry(token) {
  if (!token || typeof window === 'undefined') return null

  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const decoded = JSON.parse(window.atob(normalized))
    return Number.isFinite(decoded.exp) ? new Date(decoded.exp * 1000) : null
  } catch {
    return null
  }
}

function cookieOptions(token, fallbackDays) {
  return {
    expires: getJwtExpiry(token) || fallbackDays,
    sameSite: 'lax',
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  }
}

export function setAdminAuthTokens(tokens) {
  Cookies.set(ADMIN_ACCESS_TOKEN, tokens.accessToken, cookieOptions(tokens.accessToken, 1))
  Cookies.set(ADMIN_REFRESH_TOKEN, tokens.refreshToken, cookieOptions(tokens.refreshToken, 30))
}

export function isAdminTokenExpiring(token, thresholdSeconds = 60) {
  const expiry = getJwtExpiry(token)
  if (!expiry) return false
  return expiry.getTime() - Date.now() <= thresholdSeconds * 1000
}

export function clearAdminAuthCookies() {
  Cookies.remove(ADMIN_ACCESS_TOKEN)
  Cookies.remove(ADMIN_REFRESH_TOKEN)
}
