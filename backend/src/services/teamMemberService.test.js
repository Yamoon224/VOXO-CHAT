jest.mock('../models', () => ({
  User: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  },
  TeamInvitation: {
    findAll: jest.fn(),
  },
}));
jest.mock('./accountDeletionService', () => ({
  assertPassword: jest.fn(),
  softDeleteMember: jest.fn(),
}));
jest.mock('./accountDeletionNotifier', () => ({ notifyMemberRemoved: jest.fn() }));
// La limite de sièges a sa propre couverture (quotaService.seats.test.js).
jest.mock('./quotaService', () => ({ assertCanAddMember: jest.fn() }));

const { User, TeamInvitation } = require('../models');
const accountDeletionService = require('./accountDeletionService');
const notifier = require('./accountDeletionNotifier');
const quotaService = require('./quotaService');
const service = require('./teamMemberService');

describe('teamMemberService', () => {
  const tenantId = 'tenant-1';
  // `setMemberStatus` reçoit le tenant complet : le contrôle de sièges au
  // déblocage a besoin de son forfait, pas seulement de son identifiant.
  const tenant = { id: tenantId, subscriptionPlan: 'free' };
  const owner = { id: 'owner-1', role: 'owner' };
  const admin = { id: 'admin-1', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    User.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 'user-1' }] });
    TeamInvitation.findAll.mockResolvedValue([{ id: 'invite-1' }]);
    accountDeletionService.softDeleteMember.mockResolvedValue(new Date('2026-08-06T00:00:00Z'));
  });

  test('lists only tenant-scoped members and invitations', async () => {
    const result = await service.listMembers({ tenantId, actor: owner, page: 1, limit: 20 });

    expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId }),
    }));
    expect(TeamInvitation.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId, status: 'pending' },
    }));
    expect(result).toMatchObject({ pagination: { total: 1 }, invitations: [{ id: 'invite-1' }] });
  });

  describe('setMemberStatus', () => {
    test('blocks a manageable member without deleting it', async () => {
      const member = { id: 'user-1', role: 'user', isActive: true, update: jest.fn() };
      User.findOne.mockResolvedValue(member);

      await service.setMemberStatus({ tenant, memberId: member.id, actor: owner, isActive: false });

      expect(User.findOne).toHaveBeenCalledWith({ where: { id: member.id, tenantId } });
      expect(member.update).toHaveBeenCalledWith({ isActive: false });
      expect(accountDeletionService.softDeleteMember).not.toHaveBeenCalled();
    });

    test('unblocks a previously blocked member', async () => {
      const member = { id: 'user-1', role: 'user', isActive: false, update: jest.fn() };
      User.findOne.mockResolvedValue(member);

      await service.setMemberStatus({ tenant, memberId: member.id, actor: admin, isActive: true });

      expect(member.update).toHaveBeenCalledWith({ isActive: true });
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      const member = { id: 'user-1', role: 'user', isActive: false, update: jest.fn() };
      User.findOne.mockResolvedValue(member);

      await expect(
        service.setMemberStatus({ tenant, memberId: member.id, actor: owner, isActive: false })
      ).rejects.toMatchObject({ statusCode: 409, code: 'MEMBER_ALREADY_INACTIVE' });
      expect(member.update).not.toHaveBeenCalled();
    });

    /**
     * Un membre bloqué libère son siège. Sans ce contrôle au déblocage, le
     * couple bloquer / inviter quelqu'un / débloquer contournerait la limite.
     */
    test('re-checks the seat limit when unblocking', async () => {
      const member = { id: 'user-1', role: 'user', isActive: false, update: jest.fn() };
      User.findOne.mockResolvedValue(member);

      await service.setMemberStatus({ tenant, memberId: member.id, actor: owner, isActive: true });

      expect(quotaService.assertCanAddMember).toHaveBeenCalledWith(tenant, 1);
    });

    test('does not consume a seat check when blocking', async () => {
      const member = { id: 'user-1', role: 'user', isActive: true, update: jest.fn() };
      User.findOne.mockResolvedValue(member);

      await service.setMemberStatus({ tenant, memberId: member.id, actor: owner, isActive: false });

      expect(quotaService.assertCanAddMember).not.toHaveBeenCalled();
    });

    test('leaves the member untouched when no seat is free', async () => {
      const member = { id: 'user-1', role: 'user', isActive: false, update: jest.fn() };
      User.findOne.mockResolvedValue(member);
      quotaService.assertCanAddMember.mockRejectedValueOnce(
        Object.assign(new Error('quota'), { statusCode: 403, code: 'QUOTA_EXCEEDED' })
      );

      await expect(
        service.setMemberStatus({ tenant, memberId: member.id, actor: owner, isActive: true })
      ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
      expect(member.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMember', () => {
    test('soft deletes the member and notifies them', async () => {
      const member = { id: 'user-1', role: 'user', isActive: true, email: 'user@test.io' };
      User.findOne.mockResolvedValue(member);

      await service.deleteMember({
        tenantId, memberId: member.id, actor: owner,
        currentPassword: 'Secret1!', tenantName: 'Acme',
      });

      expect(accountDeletionService.assertPassword).toHaveBeenCalledWith(owner, 'Secret1!');
      expect(accountDeletionService.softDeleteMember).toHaveBeenCalledWith(member);
      expect(notifier.notifyMemberRemoved).toHaveBeenCalledWith(
        expect.objectContaining({ member, tenantName: 'Acme' })
      );
    });

    test('an admin cannot delete anyone', async () => {
      const member = { id: 'user-1', role: 'user', isActive: true };
      User.findOne.mockResolvedValue(member);

      await expect(
        service.deleteMember({ tenantId, memberId: member.id, actor: admin, currentPassword: 'x' })
      ).rejects.toMatchObject({ statusCode: 403, code: 'MEMBER_DELETION_DENIED' });
      expect(accountDeletionService.softDeleteMember).not.toHaveBeenCalled();
    });

    test('a wrong password stops the deletion', async () => {
      const member = { id: 'user-1', role: 'user', isActive: true };
      User.findOne.mockResolvedValue(member);
      accountDeletionService.assertPassword.mockRejectedValue(
        Object.assign(new Error('bad'), { statusCode: 400, code: 'INVALID_PASSWORD' })
      );

      await expect(
        service.deleteMember({ tenantId, memberId: member.id, actor: owner, currentPassword: 'nope' })
      ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
      expect(accountDeletionService.softDeleteMember).not.toHaveBeenCalled();
    });
  });
});
