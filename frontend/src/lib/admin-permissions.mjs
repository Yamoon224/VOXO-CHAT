/**
 * Miroir de `backend/src/config/adminPermissions.js` : sert uniquement à
 * ajuster l'interface, le backend reste seul juge.
 *
 * Les permissions effectives arrivent déjà calculées dans `admin.permissions` ;
 * ce module ne fait que les interpréter.
 */

export const RESOURCES = ['admins', 'tenants', 'plans', 'stats', 'support']

export const LEVELS = ['none', 'read', 'write']

// Libellés résolus via `useTranslations('AdminPermissions')` côté composants :
// `t(`resources.${resource}`)`, `t(`levels.${level}`)`, `t(`descriptions.${resource}`)`.

const rankOf = level => LEVELS.indexOf(level)

/** `write` couvre `read` : simple comparaison de rang. */
export function hasPermission(permissions, resource, requiredLevel) {
  return rankOf(permissions?.[resource]) >= rankOf(requiredLevel)
}

export function sanitizePermissions(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.entries(raw).reduce((clean, [resource, level]) => {
    if (RESOURCES.includes(resource) && rankOf(level) !== -1) clean[resource] = level
    return clean
  }, {})
}
