/**
 * Miroir de `backend/src/services/teamPermissionService.js` : sert uniquement à
 * masquer les actions inaccessibles, le backend reste seul juge.
 *
 * L'admin seconde le propriétaire (inviter, bloquer un utilisateur) mais ni les
 * rôles ni les suppressions ne lui sont ouverts.
 */
function isTargetable(actor, member) {
  return Boolean(actor && member) && actor.id !== member.id && member.role !== 'owner'
}

/** Blocage / déblocage. */
export function canManageMember(actor, member) {
  if (!isTargetable(actor, member)) return false
  return actor.role === 'owner' || (actor.role === 'admin' && member.role === 'user')
}

export function canUpdateRole(actor, member) {
  return isTargetable(actor, member) && actor.role === 'owner'
}

export function canDeleteMember(actor, member) {
  return isTargetable(actor, member) && actor.role === 'owner'
}

/** Ajuster les accès d'un membre : même prérogative que changer son rôle. */
export function canUpdatePermissions(actor, member) {
  return isTargetable(actor, member) && actor.role === 'owner'
}

export function canManageInvitation(actor, invitation) {
  if (!actor || !invitation) return false
  return actor.role === 'owner' || (actor.role === 'admin' && invitation.role === 'user')
}
