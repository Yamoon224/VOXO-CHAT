/**
 * Accès par ressource. `permissionOverrides` ne contient que les écarts au
 * préréglage du rôle ; `permissions` est le niveau effectif calculé par le
 * backend, qui fait autorité.
 *
 * @typedef {'none'|'read'|'write'} PermissionLevel
 * @typedef {Partial<Record<'conversations'|'knowledge'|'company'|'analytics', PermissionLevel>>} PermissionOverrides
 * @typedef {Record<'conversations'|'knowledge'|'company'|'analytics', PermissionLevel>} MemberPermissions
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {'owner'|'admin'|'user'} role
 * @property {PermissionOverrides} permissionOverrides
 * @property {MemberPermissions} permissions
 * @property {boolean} isActive
 * @property {string|null} lastLoginAt
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TeamInvitation
 * @property {string} id
 * @property {string} email
 * @property {'admin'|'user'} role
 * @property {PermissionOverrides} permissionOverrides
 * @property {MemberPermissions} permissions
 * @property {'pending'|'accepted'|'revoked'} status
 * @property {string} expiresAt
 * @property {string} createdAt
 */

/** @typedef {{email: string, role: 'admin'|'user', permissions: PermissionOverrides}} InviteMemberInput */
/** @typedef {{role: 'admin'|'user'}} UpdateMemberRoleInput */
/** @typedef {{permissions: PermissionOverrides}} UpdateMemberPermissionsInput */

export {}
