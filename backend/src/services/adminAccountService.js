const { Op } = require('sequelize');
const { AdminUser, AdminRole } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { computeEffectivePermissions } = require('../config/adminPermissions');
const roleService = require('./adminRoleService');
const invitationService = require('./adminInvitationService');

class AdminAccountService {
  toPublicAdmin(admin) {
    return {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      roleId: admin.roleId,
      roleName: admin.role?.name ?? null,
      isSystemRole: Boolean(admin.role?.isSystem),
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      permissions: computeEffectivePermissions(admin),
    };
  }

  async listAdmins({ page = 1, limit = 20, search, roleId, status }) {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

    const where = {};
    if (roleId) where.roleId = roleId;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = ['firstName', 'lastName', 'email'].map(field => ({
        [field]: { [Op.iLike]: `%${search.trim()}%` },
      }));
    }

    const { count, rows } = await AdminUser.findAndCountAll({
      where,
      include: [{ model: AdminRole, as: 'role' }],
      order: [['createdAt', 'ASC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });

    return {
      admins: rows.map(admin => this.toPublicAdmin(admin)),
      invitations: await invitationService.listPendingInvitations(),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        pages: Math.ceil(count / safeLimit),
      },
    };
  }

  async findAdminOrFail(adminId) {
    const admin = await AdminUser.findOne({
      where: { id: adminId },
      include: [{ model: AdminRole, as: 'role' }],
    });
    if (!admin) {
      throw new AppError('Compte administrateur introuvable', 404, { code: 'ADMIN_NOT_FOUND' });
    }
    return admin;
  }

  /** Ne jamais laisser la plateforme sans aucun super administrateur actif. */
  async assertNotLastSystemAdmin(admin) {
    if (!admin.role?.isSystem) return;

    const remaining = await AdminUser.count({
      where: { id: { [Op.ne]: admin.id }, roleId: admin.roleId, isActive: true },
    });
    if (remaining === 0) {
      throw new AppError(
        'Impossible : ce compte est le dernier super administrateur actif',
        409,
        { code: 'ADMIN_LAST_SYSTEM_ACCOUNT' }
      );
    }
  }

  async updateAdminRole({ actor, adminId, roleId }) {
    const admin = await this.findAdminOrFail(adminId);
    const targetRole = await roleService.getRoleOrFail(roleId);

    // Mêmes gardes qu'à l'invitation : promouvoir vers le rôle système reste
    // l'apanage du rôle système.
    invitationService.assertCanInvite(actor, targetRole);

    if (admin.roleId === roleId) {
      throw new AppError('Ce compte a déjà ce rôle', 409, { code: 'ADMIN_ROLE_UNCHANGED' });
    }
    await this.assertNotLastSystemAdmin(admin);

    await admin.update({ roleId });
    admin.role = targetRole;
    return this.toPublicAdmin(admin);
  }

  /** Blocage / déblocage : l'accès est coupé, le compte reste intact. */
  async setStatus({ actor, adminId, isActive }) {
    if (actor.id === adminId) {
      throw new AppError('Vous ne pouvez pas modifier le statut de votre propre compte', 409, {
        code: 'ADMIN_SELF_STATUS',
      });
    }

    const admin = await this.findAdminOrFail(adminId);
    if (admin.isActive === isActive) {
      throw new AppError(
        isActive ? 'Ce compte est déjà actif' : 'Ce compte est déjà bloqué',
        409,
        { code: isActive ? 'ADMIN_ALREADY_ACTIVE' : 'ADMIN_ALREADY_INACTIVE' }
      );
    }
    if (!isActive) await this.assertNotLastSystemAdmin(admin);

    await admin.update({ isActive });
    return this.toPublicAdmin(admin);
  }
}

module.exports = new AdminAccountService();
