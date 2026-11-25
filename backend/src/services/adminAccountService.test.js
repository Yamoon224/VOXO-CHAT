jest.mock('../models', () => ({
  AdminUser: { findAndCountAll: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  AdminRole: {},
}));
jest.mock('./adminRoleService', () => ({ getRoleOrFail: jest.fn() }));
jest.mock('./adminInvitationService', () => ({
  listPendingInvitations: jest.fn(),
  assertCanInvite: jest.fn(),
}));

const { AdminUser } = require('../models');
const roleService = require('./adminRoleService');
const invitationService = require('./adminInvitationService');
const service = require('./adminAccountService');

describe('adminAccountService', () => {
  const systemRole = { id: 'role-sys', name: 'super_admin', isSystem: true };
  const customRole = { id: 'role-1', name: 'Support', isSystem: false, permissions: { admins: 'read' } };
  const actor = { id: 'admin-1', role: systemRole };

  beforeEach(() => {
    jest.clearAllMocks();
    AdminUser.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    AdminUser.count.mockResolvedValue(1);
    invitationService.listPendingInvitations.mockResolvedValue([]);
  });

  test('listAdmins filters by status and paginates', async () => {
    await service.listAdmins({ page: 2, limit: 10, status: 'inactive', search: ' ana ' });

    expect(AdminUser.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      offset: 10,
      where: expect.objectContaining({ isActive: false }),
    }));
  });

  describe('updateAdminRole', () => {
    test('reassigns the role of an existing account', async () => {
      const target = { id: 'admin-2', roleId: 'role-2', role: customRole, update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);
      roleService.getRoleOrFail.mockResolvedValue(customRole);

      await service.updateAdminRole({ actor, adminId: 'admin-2', roleId: 'role-1' });

      expect(invitationService.assertCanInvite).toHaveBeenCalledWith(actor, customRole);
      expect(target.update).toHaveBeenCalledWith({ roleId: 'role-1' });
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      const target = { id: 'admin-2', roleId: 'role-1', role: customRole, update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);
      roleService.getRoleOrFail.mockResolvedValue(customRole);

      await expect(service.updateAdminRole({ actor, adminId: 'admin-2', roleId: 'role-1' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_ROLE_UNCHANGED' });

      expect(target.update).not.toHaveBeenCalled();
    });

    // Sans cette garde, rétrograder le dernier super administrateur rendrait la
    // plateforme définitivement inadministrable.
    test('refuses to demote the last active system admin', async () => {
      const target = { id: 'admin-2', roleId: 'role-sys', role: systemRole, update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);
      roleService.getRoleOrFail.mockResolvedValue(customRole);
      AdminUser.count.mockResolvedValue(0);

      await expect(service.updateAdminRole({ actor, adminId: 'admin-2', roleId: 'role-1' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_LAST_SYSTEM_ACCOUNT' });

      expect(target.update).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    test('blocks an account without deleting it', async () => {
      const target = { id: 'admin-2', isActive: true, role: customRole, update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);

      await service.setStatus({ actor, adminId: 'admin-2', isActive: false });

      expect(target.update).toHaveBeenCalledWith({ isActive: false });
    });

    test('refuses to change the status of your own account', async () => {
      await expect(service.setStatus({ actor, adminId: actor.id, isActive: false }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_SELF_STATUS' });

      expect(AdminUser.findOne).not.toHaveBeenCalled();
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      const target = { id: 'admin-2', isActive: false, role: customRole, update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);

      await expect(service.setStatus({ actor, adminId: 'admin-2', isActive: false }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_ALREADY_INACTIVE' });
    });

    test('refuses to block the last active system admin', async () => {
      const target = { id: 'admin-2', isActive: true, role: systemRole, roleId: 'role-sys', update: jest.fn() };
      AdminUser.findOne.mockResolvedValue(target);
      AdminUser.count.mockResolvedValue(0);

      await expect(service.setStatus({ actor, adminId: 'admin-2', isActive: false }))
        .rejects.toMatchObject({ statusCode: 409, code: 'ADMIN_LAST_SYSTEM_ACCOUNT' });

      expect(target.update).not.toHaveBeenCalled();
    });

    test('rejects an unknown account', async () => {
      AdminUser.findOne.mockResolvedValue(null);

      await expect(service.setStatus({ actor, adminId: 'nope', isActive: false }))
        .rejects.toMatchObject({ statusCode: 404, code: 'ADMIN_NOT_FOUND' });
    });
  });
});
