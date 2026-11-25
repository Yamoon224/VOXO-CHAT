/**
 * Miroir de `backend/src/config/permissions.js` : sert uniquement à ajuster
 * l'interface, le backend reste seul juge.
 *
 * Toute divergence avec le backend fait rougir `permissions.test.mjs`, qui
 * reproduit cas pour cas `backend/src/config/permissions.test.js`.
 */

export const RESOURCES = ['conversations', 'knowledge', 'company', 'analytics', 'agentic']

export const LEVELS = ['none', 'read', 'write']

// Libellés résolus via `useTranslations('TeamPermissions')` côté composants :
// `t(`resources.${resource}`)`, `t(`levels.${level}`)`, `t(`descriptions.${resource}`)`.

const RESOURCE_MAX_LEVEL = {
  conversations: 'write',
  knowledge: 'write',
  company: 'write',
  analytics: 'read',
  agentic: 'write',
}

const ROLE_PRESETS = {
  owner: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'write', agentic: 'write' },
  admin: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'read', agentic: 'none' },
  user: { conversations: 'write', knowledge: 'read', company: 'read', analytics: 'read', agentic: 'none' },
}

const ROLE_CAPS = {
  owner: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'write', agentic: 'write' },
  admin: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'read', agentic: 'write' },
  user: { conversations: 'write', knowledge: 'write', company: 'read', analytics: 'read', agentic: 'write' },
}

const rankOf = level => LEVELS.indexOf(level)

const isValidLevel = level => rankOf(level) !== -1

const lowestLevel = (...levels) =>
  levels.reduce((lowest, level) => (rankOf(level) < rankOf(lowest) ? level : lowest))

const buildPermissions = resolve =>
  RESOURCES.reduce((permissions, resource) => {
    permissions[resource] = resolve(resource)
    return permissions
  }, {})

const OWNER_PERMISSIONS = buildPermissions(resource => RESOURCE_MAX_LEVEL[resource])

/** Niveaux proposables dans les listes déroulantes de l'éditeur d'accès. */
export function listGrantableLevels(role, resource) {
  const cap = ROLE_CAPS[role]?.[resource] ?? 'none'
  const ceiling = lowestLevel(cap, RESOURCE_MAX_LEVEL[resource])
  return LEVELS.filter(level => rankOf(level) <= rankOf(ceiling))
}

export function sanitizeOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.entries(raw).reduce((clean, [resource, level]) => {
    if (RESOURCES.includes(resource) && isValidLevel(level)) clean[resource] = level
    return clean
  }, {})
}

export function computeEffectivePermissions(subject) {
  if (!subject || !ROLE_PRESETS[subject.role]) return buildPermissions(() => 'none')
  if (subject.role === 'owner') return { ...OWNER_PERMISSIONS }

  const overrides = sanitizeOverrides(subject.permissionOverrides)
  return buildPermissions(resource =>
    lowestLevel(
      overrides[resource] ?? ROLE_PRESETS[subject.role][resource],
      ROLE_CAPS[subject.role][resource],
      RESOURCE_MAX_LEVEL[resource]
    )
  )
}

/** `write` couvre `read` : simple comparaison de rang. */
export function hasPermission(permissions, resource, requiredLevel) {
  return rankOf(permissions?.[resource]) >= rankOf(requiredLevel)
}
