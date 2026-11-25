const { Op } = require('sequelize');
const { User, TeamInvitation } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const {
  sanitizeOverrides,
  computeEffectivePermissions,
} = require('../config/permissions');
const permissionService = require('./teamPermissionService');
const quotaService = require('./quotaService');
const accountDeletionService = require('./accountDeletionService');
const notifier = require('./accountDeletionNotifier');

class TeamMemberService {
  async listMembers({ tenantId, actor, page = 1, limit = 20, search, role, status }) {
    permissionService.assertCanManageTeam(actor);
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
    const where = { tenantId };
    if (role && ['owner', 'admin', 'user'].includes(role)) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = ['firstName', 'lastName', 'email'].map(field => ({
        [field]: { [Op.iLike]: `%${search.trim()}%` },
      }));
    }

    // `permissionOverrides` doit figurer dans les attributs : sans lui, le
    // calcul des accès effectifs partirait de `undefined` et renverrait
    // silencieusement le préréglage du rôle.
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'role',
        'permissionOverrides', 'isActive', 'lastLoginAt', 'createdAt',
      ],
      order: [['createdAt', 'ASC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });
    const invitations = await TeamInvitation.findAll({
      where: { tenantId, status: 'pending' },
      attributes: [
        'id', 'email', 'role', 'permissionOverrides', 'status', 'expiresAt', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    return {
      members: rows,
      invitations,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        pages: Math.ceil(count / safeLimit),
      },
    };
  }

  async findMember(tenantId, memberId) {
    const member = await User.findOne({ where: { id: memberId, tenantId } });
    if (!member) {
      throw new AppError('Membre introuvable', 404, { code: 'MEMBER_NOT_FOUND' });
    }
    return member;
  }

  async updateRole({ tenantId, memberId, actor, role }) {
    const member = await this.findMember(tenantId, memberId);
    permissionService.assertCanUpdateRole(actor, member, role);
    await member.update({ role });
    return this.toPublicMember(member);
  }

  /** Blocage / déblocage d'un membre : l'accès est coupé, le compte reste intact. */
  async setMemberStatus({ tenant, memberId, actor, isActive }) {
    const tenantId = tenant.id;
    const member = await this.findMember(tenantId, memberId);
    permissionService.assertCanManageMember(actor, member);
    if (member.isActive === isActive) {
      throw new AppError(
        isActive ? 'Ce membre est déjà actif' : 'Ce membre est déjà bloqué',
        409,
        { code: isActive ? 'MEMBER_ALREADY_ACTIVE' : 'MEMBER_ALREADY_INACTIVE' }
      );
    }
    // Un membre bloqué libère son siège : sans ce contrôle au déblocage, le
    // couple bloquer/inviter/débloquer contournerait la limite d'utilisateurs.
    if (isActive) {
      await quotaService.assertCanAddMember(tenant, 1);
    }
    await member.update({ isActive });
    return this.toPublicMember(member);
  }

  /**
   * Suppression d'un membre par le propriétaire : même soft delete que
   * l'auto-suppression, donc même purge à 30 jours et même libération
   * immédiate de l'email.
   */
  async deleteMember({ tenantId, memberId, actor, currentPassword, tenantName }) {
    const member = await this.findMember(tenantId, memberId);
    permissionService.assertCanDeleteMember(actor, member);
    await accountDeletionService.assertPassword(actor, currentPassword);

    const deletedAt = await accountDeletionService.softDeleteMember(member);
    await notifier.notifyMemberRemoved({ member, tenantName, deletedAt });
  }

  /**
   * Ajuste les accès d'un membre, ressource par ressource. Le propriétaire
   * envoie l'ensemble des surcharges souhaitées : un envoi vide remet le
   * membre sur le préréglage de son rôle.
   */
  async updatePermissions({ tenantId, memberId, actor, permissions }) {
    const member = await this.findMember(tenantId, memberId);
    permissionService.assertCanUpdatePermissions(actor, member);

    const permissionOverrides = sanitizeOverrides(permissions);
    permissionService.assertCanAssignPermissions(actor, member.role, permissionOverrides);

    // Objet neuf, jamais une mutation en place : Sequelize ne détecterait pas
    // un JSONB modifié sur place et n'écrirait rien.
    await member.update({ permissionOverrides });
    return this.toPublicMember(member);
  }

  toPublicMember(member) {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      isActive: member.isActive,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      // Le brut alimente l'éditeur, l'effectif alimente l'affichage.
      permissionOverrides: member.permissionOverrides || {},
      permissions: computeEffectivePermissions(member),
    };
  }
}

module.exports = new TeamMemberService();
