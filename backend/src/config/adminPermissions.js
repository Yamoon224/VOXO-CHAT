/**
 * Matrice d'accès de la plateforme d'administration.
 *
 * Deux différences avec config/permissions.js (côté tenant) :
 *  - les rôles ne sont pas un enum figé : un super_admin les crée et choisit
 *    leurs permissions, stockées dans AdminRole.permissions (JSONB) ;
 *  - il n'y a donc pas de surcharge par compte, le rôle fait foi.
 *
 * Ajouter une ressource pour un futur module (tenants, plans, support…) est un
 * ajout d'une ligne dans RESOURCES : aucune migration, le JSONB suit.
 *
 * Module pur : ni Sequelize, ni HTTP, ni AppError.
 */

const RESOURCES = ['admins', 'tenants', 'plans', 'stats', 'support'];

// Ordonné du plus faible au plus fort : le rang sert à comparer deux niveaux,
// ce qui fait que « write » satisfait une exigence « read » sans cas particulier.
const LEVELS = ['none', 'read', 'write'];

const RESOURCE_LABELS_FR = {
  admins: 'Comptes administrateurs',
  tenants: 'Entreprises clientes',
  plans: 'Forfaits',
  stats: 'Statistiques de la plateforme',
  support: 'Demandes de support',
};

const RESOURCE_LABELS_EN = {
  admins: 'Administrator accounts',
  tenants: 'Client companies',
  plans: 'Plans',
  stats: 'Platform statistics',
  support: 'Support requests',
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

const rankOf = level => LEVELS.indexOf(level);

const isValidLevel = level => rankOf(level) !== -1;

const buildPermissions = resolve =>
  RESOURCES.reduce((permissions, resource) => {
    permissions[resource] = resolve(resource);
    return permissions;
  }, {});

/** Le rôle système n'est jamais limité : sa colonne `permissions` n'est pas lue. */
const SYSTEM_ROLE_PERMISSIONS = buildPermissions(() => 'write');

/**
 * Retire tout ce qui n'est pas une paire ressource/niveau connue et renvoie
 * TOUJOURS un objet neuf : muter en place un attribut JSONB ne le marque pas
 * comme modifié auprès de Sequelize, et la mise à jour serait perdue.
 */
function sanitizePermissions(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw).reduce((clean, [resource, level]) => {
    if (RESOURCES.includes(resource) && isValidLevel(level)) clean[resource] = level;
    return clean;
  }, {});
}

/**
 * Niveau effectif par ressource pour un compte administrateur.
 * `admin.role` doit être chargé : sans lui, aucun accès n'est accordé.
 */
function computeEffectivePermissions(admin) {
  const role = admin?.role;
  if (!role) return buildPermissions(() => 'none');
  if (role.isSystem) return { ...SYSTEM_ROLE_PERMISSIONS };

  const permissions = sanitizePermissions(role.permissions);
  return buildPermissions(resource => permissions[resource] ?? 'none');
}

/** « write » couvre « read » : simple comparaison de rang. */
function hasPermission(admin, resource, requiredLevel) {
  const effective = computeEffectivePermissions(admin);
  return rankOf(effective[resource]) >= rankOf(requiredLevel);
}

module.exports = {
  RESOURCES,
  LEVELS,
  RESOURCE_LABELS_FR,
  RESOURCE_LABELS_EN,
  LEVEL_LABELS_FR,
  LEVEL_LABELS_EN,
  computeEffectivePermissions,
  hasPermission,
  sanitizePermissions,
};
