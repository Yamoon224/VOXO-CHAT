import Cookies from 'js-cookie'

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

export function setAuthTokens(tokens) {
  Cookies.set('accessToken', tokens.accessToken, cookieOptions(tokens.accessToken, 1))
  Cookies.set('refreshToken', tokens.refreshToken, cookieOptions(tokens.refreshToken, 30))
}

export function setTenantCookie(tenantId) {
  Cookies.set('tenantId', tenantId, {
    expires: 30,
    sameSite: 'lax',
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  })
}

export function isTokenExpiring(token, thresholdSeconds = 60) {
  const expiry = getJwtExpiry(token)
  if (!expiry) return false
  return expiry.getTime() - Date.now() <= thresholdSeconds * 1000
}

export function clearAuthCookies() {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
  Cookies.remove('tenantId')
}
