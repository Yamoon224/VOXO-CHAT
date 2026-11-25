const { AppError } = require('../middleware/errorMiddleware');
const { findUngrantableLevel, RESOURCE_LABELS_FR, RESOURCE_LABELS_EN } = require('../config/permissions');
const { dynamicMessage } = require('../i18n/messages');

/**
 * Matrice de permissions de l'équipe.
 *
 * L'admin seconde le propriétaire au quotidien (inviter, bloquer un
 * utilisateur) mais ne touche ni aux rôles ni aux suppressions : ces deux
 * actions redistribuent le pouvoir ou détruisent des données, elles restent
 * la prérogative du seul propriétaire.
 */
class TeamPermissionService {
  assertCanManageTeam(actor) {
    if (!actor || !['owner', 'admin'].includes(actor.role)) {
      throw new AppError('Vous ne pouvez pas gérer cette équipe', 403, {
        code: 'TEAM_ACCESS_DENIED',
      });
    }
  }

  assertIsOwner(actor, message, code) {
    if (!actor || actor.role !== 'owner') {
      throw new AppError(message, 403, { code });
    }
  }

  assertCanInvite(actor, role) {
    this.assertCanManageTeam(actor);
    if (!['admin', 'user'].includes(role) || (actor.role === 'admin' && role !== 'user')) {
      throw new AppError('Vous ne pouvez pas attribuer ce rôle', 403, {
        code: 'ROLE_ASSIGNMENT_DENIED',
      });
    }
  }

  /** Garde-fous communs à toute action visant un autre membre. */
  assertTargetIsManageable(actor, target) {
    if (actor.id === target.id) {
      throw new AppError('Vous ne pouvez pas modifier votre propre accès', 403, {
        code: 'SELF_MANAGEMENT_DENIED',
      });
    }
    if (target.role === 'owner') {
      throw new AppError('Le propriétaire du compte ne peut pas être modifié', 403, {
        code: 'OWNER_PROTECTED',
      });
    }
  }

  /** Blocage / déblocage : ouvert à l'admin, mais seulement sur les utilisateurs. */
  assertCanManageMember(actor, target) {
    this.assertCanManageTeam(actor);
    this.assertTargetIsManageable(actor, target);
    if (actor.role === 'admin' && target.role !== 'user') {
      throw new AppError('Un administrateur ne peut gérer que les utilisateurs', 403, {
        code: 'MEMBER_MANAGEMENT_DENIED',
      });
    }
  }

  assertCanUpdateRole(actor, target, nextRole) {
    this.assertIsOwner(
      actor,
      'Seul le propriétaire peut modifier les rôles',
      'ROLE_ASSIGNMENT_DENIED'
    );
    this.assertTargetIsManageable(actor, target);
    if (!['admin', 'user'].includes(nextRole)) {
      throw new AppError('Vous ne pouvez pas attribuer ce rôle', 403, {
        code: 'ROLE_ASSIGNMENT_DENIED',
      });
    }
  }

  assertCanDeleteMember(actor, target) {
    this.assertIsOwner(
      actor,
      'Seul le propriétaire peut supprimer un membre',
      'MEMBER_DELETION_DENIED'
    );
    // Le propriétaire ne peut pas partir par cette porte : son départ implique
    // un transfert de propriété, géré par la suppression de compte.
    if (actor.id === target.id) {
      throw new AppError(
        'Utilisez « Supprimer mon compte » dans votre profil pour supprimer votre propre compte',
        403,
        { code: 'SELF_MANAGEMENT_DENIED' }
      );
    }
    if (target.role === 'owner') {
      throw new AppError('Le propriétaire du compte ne peut pas être supprimé', 403, {
        code: 'OWNER_PROTECTED',
      });
    }
  }

  /**
   * Modifier les accès d'un membre reste la prérogative du propriétaire : un
   * administrateur qui accorderait l'écriture élargirait le rayon d'action de
   * l'équipe sans que le propriétaire en sache rien.
   */
  assertCanUpdatePermissions(actor, target) {
    this.assertIsOwner(
      actor,
      'Seul le propriétaire peut modifier les accès d\'un membre',
      'PERMISSION_ASSIGNMENT_DENIED'
    );
    this.assertTargetIsManageable(actor, target);
  }

  /**
   * Refus explicite quand un niveau dépasse ce que le rôle visé autorise :
   * mieux vaut expliquer au propriétaire que de rogner sa demande en silence.
   * Un administrateur peut inviter, mais sans personnaliser les accès.
   */
  assertCanAssignPermissions(actor, role, overrides) {
    if (actor.role !== 'owner' && Object.keys(overrides || {}).length > 0) {
      throw new AppError('Seul le propriétaire peut personnaliser les accès', 403, {
        code: 'PERMISSION_ASSIGNMENT_DENIED',
      });
    }

    const offending = findUngrantableLevel(role, overrides);
    if (offending) {
      // Le message nomme la ressource concernée : valeur dynamique que
      // MESSAGES[code], une chaîne plate, ne peut pas porter. Texte résolu ici
      // (cf. dynamicMessage, src/i18n/messages.js).
      throw new AppError(
        dynamicMessage({
          fr: `Ce niveau d'accès ne peut pas être attribué à ce rôle sur « ${RESOURCE_LABELS_FR[offending.resource]} »`,
          en: `This access level cannot be granted to this role on "${RESOURCE_LABELS_EN[offending.resource]}"`,
        }),
        403,
        { code: 'PERMISSION_LEVEL_DENIED', preTranslated: true, details: offending }
      );
    }
  }
}

module.exports = new TeamPermissionService();
