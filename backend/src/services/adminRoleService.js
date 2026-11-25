const { AdminRole, AdminUser } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { sanitizePermissions, computeEffectivePermissions } = require('../config/adminPermissions');

/**
 * Définition des rôles de la plateforme d'administration.
 *
 * Seul le rôle système peut en créer : accorder cette capacité par simple
 * permission reviendrait à laisser n'importe quel rôle s'auto-promouvoir.
 */
class AdminRoleService {
  assertIsSystemActor(actor) {
    if (actor?.role?.isSystem) return;
    throw new AppError('Cette action est réservée aux super administrateurs', 403, {
      code: 'ADMIN_SYSTEM_ROLE_REQUIRED',
    });
  }

  toPublicRole(role) {
    return {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      // Le rôle système n'a pas de permissions stockées : elles sont calculées.
      permissions: computeEffectivePermissions({ role }),
    };
  }

  async listRoles() {
    const roles = await AdminRole.findAll({ order: [['isSystem', 'DESC'], ['name', 'ASC']] });
    return roles.map(role => this.toPublicRole(role));
  }

  async getRoleOrFail(roleId) {
    const role = await AdminRole.findByPk(roleId);
    if (!role) {
      throw new AppError('Rôle introuvable', 404, { code: 'ADMIN_ROLE_NOT_FOUND' });
    }
    return role;
  }

  async createRole({ actor, name, permissions }) {
    this.assertIsSystemActor(actor);

    try {
      const role = await AdminRole.create({
        name: name.trim(),
        isSystem: false,
        permissions: sanitizePermissions(permissions),
      });
      return this.toPublicRole(role);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Un rôle porte déjà ce nom', 409, { code: 'ADMIN_ROLE_NAME_TAKEN' });
      }
      throw error;
    }
  }

  async updateRole({ actor, roleId, name, permissions }) {
    this.assertIsSystemActor(actor);
    const role = await this.getRoleOrFail(roleId);

    if (role.isSystem) {
      throw new AppError('Le rôle super administrateur ne peut pas être modifié', 409, {
        code: 'ADMIN_ROLE_IS_SYSTEM',
      });
    }

    const changes = {};
    if (name !== undefined) changes.name = name.trim();
    if (permissions !== undefined) changes.permissions = sanitizePermissions(permissions);

    try {
      await role.update(changes);
      return this.toPublicRole(role);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Un rôle porte déjà ce nom', 409, { code: 'ADMIN_ROLE_NAME_TAKEN' });
      }
      throw error;
    }
  }

  async deleteRole({ actor, roleId }) {
    this.assertIsSystemActor(actor);
    const role = await this.getRoleOrFail(roleId);

    if (role.isSystem) {
      throw new AppError('Le rôle super administrateur ne peut pas être supprimé', 409, {
        code: 'ADMIN_ROLE_IS_SYSTEM',
      });
    }

    const assigned = await AdminUser.count({ where: { roleId } });
    if (assigned > 0) {
      throw new AppError(
        'Ce rôle est encore attribué à des comptes : réattribuez-les avant de le supprimer',
        409,
        { code: 'ADMIN_ROLE_IN_USE', details: { assigned } }
      );
    }

    await role.destroy();
  }
}

module.exports = new AdminRoleService();
