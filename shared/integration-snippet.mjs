import { buildMobileSnippet, isMobileVariant } from './integration-snippet-mobile.mjs'

function normalizeApiUrl(apiUrl) {
  if (typeof apiUrl !== 'string' || !apiUrl.trim()) return null
  try {
    const url = new URL(apiUrl.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch { return null }
}

function widgetBaseUrl(apiUrl) {
  const normalizedApiUrl = normalizeApiUrl(apiUrl)
  if (!normalizedApiUrl) return null
  try {
    const url = new URL(normalizedApiUrl)
    url.pathname = url.pathname.replace(/\/api\/?$/, '').replace(/\/+$/, '') || '/'
    return url.toString().replace(/\/$/, '')
  } catch { return null }
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function getWidgetBaseUrl(apiUrl) { return widgetBaseUrl(apiUrl) }

export function buildIntegrationSnippet({ apiUrl, tenantId, chatbot = {}, variant = 'script' }) {
  const normalizedApiUrl = normalizeApiUrl(apiUrl)
  const baseUrl = widgetBaseUrl(apiUrl)
  if (!normalizedApiUrl || !baseUrl) return null
  const resolvedTenantId = tenantId || 'your-tenant-id'
  // Les SDK mobiles ne consomment pas window.ChatBotConfig : ils prennent
  // apiUrl et tenantId à l'initialisation, sans widget.js.
  if (isMobileVariant(variant)) return buildMobileSnippet({ apiUrl: normalizedApiUrl, tenantId: resolvedTenantId, variant })
  const config = { apiUrl: normalizedApiUrl, tenantId: resolvedTenantId, name: chatbot.name || 'Assistant', welcomeMessage: chatbot.welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?', theme: chatbot.theme || {}, options: { showPoweredBy: !chatbot.features?.customBranding } }
  const serialized = JSON.stringify(config, null, 2).replace(/</g, '\\u003c')
  const attributes = `src="${escapeHtmlAttribute(`${baseUrl}/widget.js`)}" data-api-url="${escapeHtmlAttribute(normalizedApiUrl)}" data-tenant-id="${escapeHtmlAttribute(resolvedTenantId)}" async`
  const script = `<script>\nwindow.ChatBotConfig = ${serialized};\n</script>\n<script ${attributes}></script>`
  if (variant === 'html') return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Mon site</title></head><body>\n<!-- Servez ce fichier via HTTP(S) ; ne l'ouvrez pas directement en file://. -->\n${script}\n</body></html>`
  if (variant === 'config') return `// À placer avant le chargement de widget.js\nwindow.ChatBotConfig = ${serialized};`
  return script
}
