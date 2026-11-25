const { AppError } = require('./errorMiddleware');
const {
  hasPermission, RESOURCE_LABELS_FR, RESOURCE_LABELS_EN, LEVEL_LABELS_FR, LEVEL_LABELS_EN,
} = require('../config/permissions');
const { requestLocale } = require('../i18n/locale');

/**
 * Garde une route derrière un niveau d'accès sur une ressource.
 *
 * À placer APRÈS `authenticate`, qui recharge l'utilisateur depuis la base à
 * chaque requête : les accès appliqués sont donc toujours ceux du moment, sans
 * révocation de jeton à gérer quand le propriétaire modifie les permissions.
 *
 * `write` satisfait une exigence `read` (comparaison de rang dans
 * config/permissions.js), il est donc inutile de déclarer les deux.
 *
 *   router.put('/:id', authenticate, requirePermission('knowledge', 'write'), handler);
 */
const requirePermission = (resource, level) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentification requise', 401, { code: 'AUTH_REQUIRED' }));
  }

  if (hasPermission(req.user, resource, level)) return next();

  // Le message nomme la ressource concernée (ex. « Base de connaissances »),
  // une valeur dynamique que le registre statique MESSAGES[code] ne peut pas
  // porter (il ne stocke qu'une paire {fr, en} figée par code). On résout donc
  // le texte localisé ici, au point de throw, plutôt que de compter sur
  // translate(code) — tout en gardant `code: 'PERMISSION_DENIED'` stable pour
  // les clients qui filtrent dessus.
  const locale = requestLocale(req);
  const isEn = locale === 'en';
  const action = isEn
    ? (level === 'write' ? 'edit' : 'view')
    : (level === 'write' ? 'modifier' : 'consulter');
  const resourceLabel = (isEn ? RESOURCE_LABELS_EN : RESOURCE_LABELS_FR)[resource];
  const message = isEn
    ? `You do not have the required permissions to ${action} "${resourceLabel}"`
    : `Vous n'avez pas les droits nécessaires pour ${action} « ${resourceLabel} »`;

  return next(
    new AppError(
      message,
      403,
      {
        code: 'PERMISSION_DENIED',
        preTranslated: true,
        details: {
          resource,
          required: level,
          requiredLabel: (isEn ? LEVEL_LABELS_EN : LEVEL_LABELS_FR)[level],
        },
      }
    )
  );
};

module.exports = { requirePermission };
