const { AppError } = require('./errorMiddleware');
const { matchesAllowedDomains } = require('../../../shared/allowed-domains');
const { matchesAllowedApps } = require('../../../shared/allowed-apps');

function widgetOriginGuard(req, res, next) {
  const { allowedDomains = [], enforceDomains = false } = req.tenant || {};
  const origin = req.get('Origin');
  if (!origin || !allowedDomains.length || matchesAllowedDomains(origin, allowedDomains)) return next();
  console.warn(JSON.stringify({ event: 'widget_origin_not_allowed', tenantId: req.tenant.id, origin, route: req.originalUrl, blocked: enforceDomains }));
  if (!enforceDomains) return next();
  return next(new AppError('Ce widget ne peut pas être utilisé depuis ce domaine.', 403, { code: 'ORIGIN_NOT_ALLOWED' }));
}

/**
 * Verdict sur l'identifiant d'application d'un client natif (voir mobile/CONTRACT.md).
 * Ne concerne que les requêtes SANS `Origin` : le web reste régi par les domaines. Partagé
 * entre le garde REST et l'autorisation du WebSocket.
 *
 * @returns {{ ok: boolean, blocked: boolean }} `ok: false` = identifiant absent de la liste ;
 * `blocked` = le propriétaire a activé le blocage (sinon, simple observation).
 */
function appIdVerdict(tenant, { origin, appId } = {}) {
  const { allowedAppIds = [], enforceAppIds = false } = tenant || {};
  if (origin || !allowedAppIds.length || matchesAllowedApps(appId, allowedAppIds)) return { ok: true, blocked: false };
  return { ok: false, blocked: enforceAppIds === true };
}

function logAppIdMismatch(tenant, appId, route, blocked) {
  console.warn(JSON.stringify({ event: 'widget_app_not_allowed', tenantId: tenant.id, appId: appId || null, route, blocked }));
}

// `X-App-Id` est déclaratif (forgeable) : il écarte l'usage involontaire, pas un attaquant décidé.
function widgetAppIdGuard(req, res, next) {
  const appId = req.get('X-App-Id');
  const verdict = appIdVerdict(req.tenant, { origin: req.get('Origin'), appId });
  if (verdict.ok) return next();
  logAppIdMismatch(req.tenant, appId, req.originalUrl, verdict.blocked);
  if (!verdict.blocked) return next();
  return next(new AppError('Cette application n’est pas autorisée à utiliser ce chatbot.', 403, { code: 'APP_NOT_ALLOWED' }));
}

module.exports = { widgetOriginGuard, widgetAppIdGuard, appIdVerdict, logAppIdMismatch };
