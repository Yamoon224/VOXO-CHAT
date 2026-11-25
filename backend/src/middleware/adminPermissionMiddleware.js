const { AppError } = require('./errorMiddleware');
const {
  hasPermission, RESOURCE_LABELS_FR, RESOURCE_LABELS_EN, LEVEL_LABELS_FR, LEVEL_LABELS_EN,
} = require('../config/adminPermissions');
const { requestLocale } = require('../i18n/locale');
const { dynamicMessage } = require('../i18n/messages');

/**
 * Garde une route d'administration derrière un niveau d'accès sur une ressource.
 * À placer APRÈS `authenticateAdmin`.
 *
 *   router.post('/', authenticateAdmin, requireAdminPermission('admins', 'write'), handler);
 */
const requireAdminPermission = (resource, level) => (req, res, next) => {
  if (!req.adminUser) {
    return next(new AppError('Authentification requise', 401, { code: 'AUTH_REQUIRED' }));
  }

  if (hasPermission(req.adminUser, resource, level)) return next();

  // Message dynamique (il nomme la ressource) : MESSAGES[code] ne porte qu'un
  // texte figé, donc on résout la paire {fr, en} ici et on marque
  // preTranslated, en gardant `code` stable pour les clients. Cf. le
  // commentaire de dynamicMessage() dans src/i18n/messages.js.
  const locale = requestLocale(req);
  const isEn = locale === 'en';
  return next(
    new AppError(
      dynamicMessage({
        fr: `Vous n'avez pas les droits nécessaires pour ${level === 'write' ? 'modifier' : 'consulter'} « ${RESOURCE_LABELS_FR[resource]} »`,
        en: `You do not have the required permissions to ${level === 'write' ? 'edit' : 'view'} "${RESOURCE_LABELS_EN[resource]}"`,
      }, locale),
      403,
      {
        code: 'ADMIN_PERMISSION_DENIED',
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

/**
 * Réserve une route au rôle système (super_admin). Définir les rôles eux-mêmes
 * ne peut pas être une simple permission : ce serait s'accorder soi-même
 * n'importe quel accès.
 */
const requireSystemRole = (req, res, next) => {
  if (!req.adminUser) {
    return next(new AppError('Authentification requise', 401, { code: 'AUTH_REQUIRED' }));
  }

  if (req.adminUser.role?.isSystem) return next();

  return next(
    new AppError('Cette action est réservée aux super administrateurs', 403, {
      code: 'ADMIN_SYSTEM_ROLE_REQUIRED',
    })
  );
};

module.exports = { requireAdminPermission, requireSystemRole };
