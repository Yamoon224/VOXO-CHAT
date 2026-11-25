const fallbackFrontendUrl = 'http://localhost:3001'

export function getBackendBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL
  if (!configuredUrl) return null
  try {
    const url = new URL(configuredUrl)
    url.pathname = url.pathname.replace(/\/api\/?$/, '').replace(/\/+$/, '') || '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch { return null }
}

export function getFrontendBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : null

  return (configuredUrl || browserOrigin || fallbackFrontendUrl).replace(/\/+$/, '')
}

export function getFrontendUrl(path = '') {
  if (!path) return getFrontendBaseUrl()

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getFrontendBaseUrl()}${normalizedPath}`
}
