const { normalizeLocale } = require('../i18n/locale');

function resolveLocale(req, _res, next) {
  req.locale = normalizeLocale(
    req.query?.locale
      || req.body?.locale
      || req.user?.preferredLocale
      || req.adminUser?.preferredLocale
      || req.get('Accept-Language')
  );
  next();
}

module.exports = { resolveLocale };
