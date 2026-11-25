jest.mock('../models', () => ({
  User: { findAndCountAll: jest.fn(), findOne: jest.fn() },
  TeamInvitation: { findAll: jest.fn() },
}));
jest.mock('./accountDeletionService', () => ({
  assertPassword: jest.fn(),
  softDeleteMember: jest.fn(),
}));
jest.mock('./accountDeletionNotifier', () => ({ notifyMemberRemoved: jest.fn() }));

const { User, TeamInvitation } = require('../models');
const service = require('./teamMemberService');

describe('teamMemberService permissions', () => {
  const tenantId = 'tenant-1';
  const owner = { id: 'owner-1', role: 'owner' };
  const admin = { id: 'admin-1', role: 'admin' };

  const memberWith = (role, permissionOverrides = {}) => ({
    id: 'member-1',
    role,
    permissionOverrides,
    update: jest.fn(function (data) {
      Object.assign(this, data);
      return this;
    }),
  });

  beforeEach(() => jest.clearAllMocks());

  describe('updatePermissions', () => {
    test('persists the sanitized overrides and returns the effective access', async () => {
      const member = memberWith('user');
      User.findOne.mockResolvedValue(member);

      const result = await service.updatePermissions({
        tenantId,
        memberId: member.id,
        actor: owner,
        permissions: { knowledge: 'write', billing: 'write' },
      });

      expect(member.update).toHaveBeenCalledWith({
        permissionOverrides: { knowledge: 'write' },
      });
      expect(result.permissions.knowledge).toBe('write');
      expect(result.permissionOverrides).toEqual({ knowledge: 'write' });
    });

    // Muter le JSONB en place ne le marquerait pas modifié auprès de Sequelize.
    test('hands Sequelize a fresh object, never the caller payload', async () => {
      const member = memberWith('user');
      User.findOne.mockResolvedValue(member);
      const payload = { knowledge: 'write' };

      await service.updatePermissions({
        tenantId, memberId: member.id, actor: owner, permissions: payload,
      });

      expect(member.update.mock.calls[0][0].permissionOverrides).not.toBe(payload);
    });

    test('resets a member to the role preset when given an empty payload', async () => {
      const member = memberWith('user', { knowledge: 'write' });
      User.findOne.mockResolvedValue(member);

      const result = await service.updatePermissions({
        tenantId, memberId: member.id, actor: owner, permissions: {},
      });

      expect(member.update).toHaveBeenCalledWith({ permissionOverrides: {} });
      expect(result.permissions.knowledge).toBe('read');
    });

    test('refuses a level the target role could never hold', async () => {
      User.findOne.mockResolvedValue(memberWith('user'));

      await expect(service.updatePermissions({
        tenantId, memberId: 'member-1', actor: owner, permissions: { company: 'write' },
      })).rejects.toMatchObject({ statusCode: 403, code: 'PERMISSION_LEVEL_DENIED' });
    });

    test('refuses an admin, since access changes belong to the owner', async () => {
      User.findOne.mockResolvedValue(memberWith('user'));

      await expect(service.updatePermissions({
        tenantId, memberId: 'member-1', actor: admin, permissions: { knowledge: 'write' },
      })).rejects.toMatchObject({ code: 'PERMISSION_ASSIGNMENT_DENIED' });
    });

    test('scopes the lookup to the tenant', async () => {
      User.findOne.mockResolvedValue(memberWith('user'));

      await service.updatePermissions({
        tenantId, memberId: 'member-1', actor: owner, permissions: {},
      });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { id: 'member-1', tenantId },
      });
    });
  });

  // Sans cet attribut, toJSON calculerait depuis `undefined` et renverrait le
  // préréglage du rôle sans que rien ne le signale.
  test('listMembers selects permissionOverrides for both members and invitations', async () => {
    User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    TeamInvitation.findAll.mockResolvedValue([]);

    await service.listMembers({ tenantId, actor: owner });

    expect(User.findAndCountAll.mock.calls[0][0].attributes).toContain('permissionOverrides');
    expect(TeamInvitation.findAll.mock.calls[0][0].attributes).toContain('permissionOverrides');
  });
});
