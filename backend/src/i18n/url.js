const { normalizeLocale } = require('./locale');

function localizedFrontendUrl(baseUrl, path, locale) {
  const prefix = `/${normalizeLocale(locale)}`;
  return `${String(baseUrl).replace(/\/+$/, '')}${prefix}/${String(path).replace(/^\/+/, '')}`;
}

module.exports = { localizedFrontendUrl };
