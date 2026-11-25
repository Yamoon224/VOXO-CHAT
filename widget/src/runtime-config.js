function resolveScriptBaseUrl() {
  if (typeof document === 'undefined') return null;

  const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!script?.src) return null;

  try {
    const scriptUrl = new URL(script.src);
    const directoryPath = scriptUrl.pathname.replace(/\/[^/]*$/, '');
    return `${scriptUrl.origin}${directoryPath}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export const widgetScriptBaseUrl = resolveScriptBaseUrl();

export function getScriptConfig() {
  if (typeof document === 'undefined') return {};
  const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!script) return {};

  const config = {};
  if (script.dataset.tenantId) config.tenantId = script.dataset.tenantId;
  if (script.dataset.apiUrl) config.apiUrl = script.dataset.apiUrl;
  if (script.dataset.locale) config.locale = script.dataset.locale;
  return config;
}

export function getDefaultApiUrl() {
  return widgetScriptBaseUrl ? `${widgetScriptBaseUrl}/api` : null;
}

export function getDefaultFrontendUrl() {
  return import.meta.env?.VITE_FRONTEND_URL || widgetScriptBaseUrl;
}

export function getDefaultWidgetAssetUrl(fileName, baseUrl = widgetScriptBaseUrl) {
  if (!baseUrl || !fileName) return null;
  const path = String(fileName).split('/').map(encodeURIComponent).join('/');
  return `${String(baseUrl).replace(/\/+$/, '')}/public/widget-assets/${path}`;
}
