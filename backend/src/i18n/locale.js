const SUPPORTED_LOCALES = Object.freeze(['fr', 'en']);
const DEFAULT_LOCALE = 'fr';

function normalizeLocale(value) {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const locale = value.trim().toLowerCase().split(/[-_,;]/)[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

function requestLocale(req) {
  return normalizeLocale(
    req?.query?.locale
      || req?.body?.locale
      || req?.user?.preferredLocale
      || req?.adminUser?.preferredLocale
      || req?.get?.('Accept-Language')
      || req?.locale
  );
}

module.exports = { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale, requestLocale };
