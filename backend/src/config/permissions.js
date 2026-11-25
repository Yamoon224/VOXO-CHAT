/**
 * Matrice d'accès aux ressources, par membre.
 *
 * Deux axes indépendants gouvernent l'application :
 *  - le RÔLE (owner/admin/user) décide qui gère l'équipe : inviter, bloquer,
 *    supprimer un membre, changer un rôle. Cet axe vit dans teamPermissionService.
 *  - les PERMISSIONS, ici, décident ce qu'un membre peut faire sur les quatre
 *    ressources métier. La gestion d'équipe n'en fait délibérément pas partie :
 *    elle décide « qui a accès », alors que `company` décrit « ce qu'est
 *    l'entreprise ». Deux questions différentes.
 *
 * On ne stocke que la SURCHARGE (User.permissionOverrides) ; le niveau effectif
 * est calculé à la lecture depuis le rôle. Ainsi un membre rétrogradé retombe
 * immédiatement dans les clous sans réécriture de données, et faire évoluer les
 * préréglages ci-dessous s'applique rétroactivement sans migration.
 *
 * Module pur : ni Sequelize, ni HTTP, ni AppError. Le frontend en tient un
 * miroir dans frontend/src/lib/permissions.mjs.
 */

const RESOURCES = ['conversations', 'knowledge', 'company', 'analytics', 'agentic'];

// Ordonné du plus faible au plus fort : le rang sert à comparer deux niveaux,
// ce qui fait que « write » satisfait une exigence « read » sans cas particulier.
const LEVELS = ['none', 'read', 'write'];

const RESOURCE_LABELS_FR = {
  conversations: 'Conversations',
  knowledge: 'Base de connaissances',
  company: 'Entreprise',
  analytics: 'Statistiques',
  agentic: 'Actions agentiques',
};

const RESOURCE_LABELS_EN = {
  conversations: 'Conversations',
  knowledge: 'Knowledge base',
  company: 'Company',
  analytics: 'Analytics',
  agentic: 'Agentic actions',
};

const LEVEL_LABELS_FR = {
  none: 'Aucun accès',
  read: 'Lecture',
  write: 'Écriture',
};

const LEVEL_LABELS_EN = {
  none: 'No access',
  read: 'Read',
  write: 'Write',
};

// Aucun endpoint analytics n'écrit : proposer « write » créerait un état mort.
const RESOURCE_MAX_LEVEL = {
  conversations: 'write',
  knowledge: 'write',
  company: 'write',
  analytics: 'read',
  agentic: 'write',
};

/** Niveau appliqué quand le membre n'a aucune surcharge sur la ressource. */
const ROLE_PRESETS = {
  owner: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'write', agentic: 'write' },
  admin: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'read', agentic: 'none' },
  user: { conversations: 'write', knowledge: 'read', company: 'read', analytics: 'read', agentic: 'none' },
};

/**
 * Maximum atteignable quel que soit la surcharge. C'est ici qu'est encodée la
 * règle « les informations de l'entreprise ne sont modifiables que par les
 * propriétaires et administrateurs » : un `user` plafonne à la lecture.
 */
const ROLE_CAPS = {
  owner: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'write', agentic: 'write' },
  admin: { conversations: 'write', knowledge: 'write', company: 'write', analytics: 'read', agentic: 'write' },
  user: { conversations: 'write', knowledge: 'write', company: 'read', analytics: 'read', agentic: 'write' },
};

const rankOf = level => LEVELS.indexOf(level);

const isValidLevel = level => rankOf(level) !== -1;

const lowestLevel = (...levels) =>
  levels.reduce((lowest, level) => (rankOf(level) < rankOf(lowest) ? level : lowest));

const buildPermissions = resolve =>
  RESOURCES.reduce((permissions, resource) => {
    permissions[resource] = resolve(resource);
    return permissions;
  }, {});

/** Le propriétaire n'est jamais limité : sa colonne de surcharge n'est pas lue. */
const OWNER_PERMISSIONS = buildPermissions(resource => RESOURCE_MAX_LEVEL[resource]);

/**
 * Niveaux réellement attribuables à un rôle sur une ressource. Alimente à la
 * fois la validation Joi et les listes déroulantes du frontend, ce qui évite
 * de proposer un niveau que le backend refuserait.
 */
function listGrantableLevels(role, resource) {
  const cap = ROLE_CAPS[role]?.[resource] ?? 'none';
  const ceiling = lowestLevel(cap, RESOURCE_MAX_LEVEL[resource]);
  return LEVELS.filter(level => rankOf(level) <= rankOf(ceiling));
}

/**
 * Retire tout ce qui n'est pas une paire ressource/niveau connue et renvoie
 * TOUJOURS un objet neuf : muter en place un attribut JSONB ne le marque pas
 * comme modifié auprès de Sequelize, et la mise à jour serait perdue.
 */
function sanitizeOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw).reduce((clean, [resource, level]) => {
    if (RESOURCES.includes(resource) && isValidLevel(level)) clean[resource] = level;
    return clean;
  }, {});
}

/** Le niveau demandé dépasse-t-il ce que le rôle autorise ? */
function isLevelGrantable(role, resource, level) {
  return listGrantableLevels(role, resource).includes(level);
}

/** Première paire ressource/niveau non attribuable, ou null si tout passe. */
function findUngrantableLevel(role, overrides) {
  const entry = Object.entries(sanitizeOverrides(overrides)).find(
    ([resource, level]) => !isLevelGrantable(role, resource, level)
  );
  return entry ? { resource: entry[0], level: entry[1] } : null;
}

/**
 * Niveau effectif par ressource. Le plafonnement est silencieux ici : c'est le
 * filet du cas réel — un membre passé admin → user conserve une surcharge
 * `company: write` devenue illégitime, qui retombe d'elle-même à « read ».
 * Le refus explicite, lui, se fait à l'écriture (voir findUngrantableLevel).
 */
function computeEffectivePermissions(subject) {
  if (!subject || !ROLE_PRESETS[subject.role]) return buildPermissions(() => 'none');
  if (subject.role === 'owner') return { ...OWNER_PERMISSIONS };

  const overrides = sanitizeOverrides(subject.permissionOverrides);
  return buildPermissions(resource =>
    lowestLevel(
      overrides[resource] ?? ROLE_PRESETS[subject.role][resource],
      ROLE_CAPS[subject.role][resource],
      RESOURCE_MAX_LEVEL[resource]
    )
  );
}

/** « write » couvre « read » : simple comparaison de rang. */
function hasPermission(subject, resource, requiredLevel) {
  const effective = computeEffectivePermissions(subject);
  return rankOf(effective[resource]) >= rankOf(requiredLevel);
}

module.exports = {
  RESOURCES,
  LEVELS,
  RESOURCE_LABELS_FR,
  RESOURCE_LABELS_EN,
  LEVEL_LABELS_FR,
  LEVEL_LABELS_EN,
  ROLE_PRESETS,
  ROLE_CAPS,
  RESOURCE_MAX_LEVEL,
  computeEffectivePermissions,
  hasPermission,
  sanitizeOverrides,
  listGrantableLevels,
  isLevelGrantable,
  findUngrantableLevel,
};
