export function websocketUrl(path) {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  const url = new URL(api)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/$/, '')}${path}`
  return url.toString()
}

export function nextReconnectDelay(attempt) {
  return Math.min(1000 * (2 ** attempt), 15000)
}
