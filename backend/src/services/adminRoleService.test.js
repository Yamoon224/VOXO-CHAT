jest.mock('../models', () => ({
  AdminRole: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  AdminUser: { count: jest.fn() },
}));

const { AdminRole, AdminUser } = require('../models');
const service = require('./adminRoleService');

describe('adminRoleService', () => {
  const superAdmin = { id: 'admin-1', role: { isSystem: true } };
  const customAdmin = { id: 'admin-2', role: { isSystem: false, permissions: { admins: 'write' } } };

  beforeEach(() => {
    jest.clearAllMocks();
    AdminUser.count.mockResolvedValue(0);
  });

  describe('createRole', () => {
    test('creates a non-system role with sanitized permissions', async () => {
      AdminRole.create.mockResolvedValue({ id: 'role-1', name: 'Support', isSystem: false, permissions: { admins: 'read' } });

      await service.createRole({
        actor: superAdmin,
        name: '  Support  ',
        permissions: { admins: 'read', inconnu: 'write' },
      });

      expect(AdminRole.create).toHaveBeenCalledWith({
        name: 'Support',
        isSystem: false,
        permissions: { admins: 'read' },
      });
    });

    // Définir les rôles ne peut pas être une simple permission : un rôle
    // disposant de `admins:write` s'accorderait sinon n'importe quel accès.
    test('refuses an actor that is not a system-role holder', async () => {
      await expect(service.createRole({ actor: customAdmin, name: 'Support', permissions: {} }))
        .rejects.toMatchObject({ statusCode: 403, code: 'ADMIN_SYSTEM_ROLE_REQUIRED' });

      expect(AdminRole.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    test('refuses to modify the system role', async () => {
      const systemRole = { id: 'role-sys', isSystem: true, update: jest.fn() };
      AdminRole.findByPk.mockResolvedValue(systemRole);

      await expect(service.updateRole({ actor: superAdmin, roleId: 'role-sys', name: 'autre' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_ROLE_IS_SYSTEM' });

      expect(systemRole.update).not.toHaveBeenCalled();
    });

    test('updates only the provided fields of a custom role', async () => {
      const role = { id: 'role-1', name: 'Support', isSystem: false, permissions: {}, update: jest.fn() };
      AdminRole.findByPk.mockResolvedValue(role);

      await service.updateRole({ actor: superAdmin, roleId: 'role-1', permissions: { admins: 'write' } });

      expect(role.update).toHaveBeenCalledWith({ permissions: { admins: 'write' } });
    });
  });

  describe('deleteRole', () => {
    test('refuses to delete the system role', async () => {
      const systemRole = { id: 'role-sys', isSystem: true, destroy: jest.fn() };
      AdminRole.findByPk.mockResolvedValue(systemRole);

      await expect(service.deleteRole({ actor: superAdmin, roleId: 'role-sys' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_ROLE_IS_SYSTEM' });

      expect(systemRole.destroy).not.toHaveBeenCalled();
    });

    test('refuses to delete a role still assigned to accounts', async () => {
      const role = { id: 'role-1', isSystem: false, destroy: jest.fn() };
      AdminRole.findByPk.mockResolvedValue(role);
      AdminUser.count.mockResolvedValue(2);

      await expect(service.deleteRole({ actor: superAdmin, roleId: 'role-1' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_ROLE_IN_USE' });

      expect(role.destroy).not.toHaveBeenCalled();
    });

    test('deletes an unused custom role', async () => {
      const role = { id: 'role-1', isSystem: false, destroy: jest.fn() };
      AdminRole.findByPk.mockResolvedValue(role);

      await service.deleteRole({ actor: superAdmin, roleId: 'role-1' });

      expect(role.destroy).toHaveBeenCalled();
    });

    test('rejects an unknown role', async () => {
      AdminRole.findByPk.mockResolvedValue(null);

      await expect(service.deleteRole({ actor: superAdmin, roleId: 'nope' }))
        .rejects.toMatchObject({ statusCode: 404, code: 'ADMIN_ROLE_NOT_FOUND' });
    });
  });

  test('listRoles exposes computed permissions for the system role', async () => {
    AdminRole.findAll.mockResolvedValue([
      { id: 'role-sys', name: 'super_admin', isSystem: true, permissions: {} },
    ]);

    const roles = await service.listRoles();

    expect(roles[0]).toMatchObject({ name: 'super_admin', permissions: { admins: 'write' } });
  });
});
