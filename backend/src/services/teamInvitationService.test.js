jest.mock('../models', () => ({
  TeamInvitation: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Tenant: {
    findOne: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('./emailService', () => ({
  sendTeamInvitation: jest.fn(),
  sendInvitationAccepted: jest.fn(),
}));
// La limite de sièges a sa propre couverture (quotaService.seats.test.js) :
// ici on la neutralise pour ne tester que le parcours d'invitation.
jest.mock('./quotaService', () => ({ assertCanAddMember: jest.fn() }));

const { TeamInvitation, User, Tenant, sequelize } = require('../models');
const emailService = require('./emailService');
const service = require('./teamInvitationService');

describe('teamInvitationService', () => {
  const tenant = { id: '11111111-1111-4111-8111-111111111111', name: 'Acme' };
  const actor = { id: 'owner-1', role: 'owner', firstName: 'Ada', lastName: 'Lovelace' };
  let transaction;

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = {
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    User.findOne.mockResolvedValue(null);
    TeamInvitation.findOne.mockResolvedValue(null);
    // Par défaut l'entreprise est active : les cas nominaux ne s'en occupent pas.
    Tenant.findOne.mockResolvedValue(tenant);
    emailService.sendTeamInvitation.mockResolvedValue(undefined);
    emailService.sendInvitationAccepted.mockResolvedValue(true);
  });

  test('creates an invitation without persisting the raw token', async () => {
    const invitation = {
      id: 'invite-1',
      email: 'invitee@example.com',
      role: 'admin',
      status: 'pending',
      expiresAt: new Date('2026-07-20T00:00:00Z'),
      createdAt: new Date(),
      destroy: jest.fn(),
    };
    TeamInvitation.create.mockImplementation(async values => Object.assign(invitation, values));

    const result = await service.createInvitation({
      tenant,
      actor,
      email: ' Invitee@Example.com ',
      role: 'admin',
    });

    const saved = TeamInvitation.create.mock.calls[0][0];
    const emailCall = emailService.sendTeamInvitation.mock.calls[0][0];
    const rawToken = new URL(emailCall.invitationUrl).searchParams.get('token');
    expect(saved).toMatchObject({ email: 'invitee@example.com', role: 'admin' });
    expect(saved.tokenHash).toHaveLength(64);
    expect(saved.tokenHash).not.toBe(rawToken);
    expect(result).not.toHaveProperty('tokenHash');
  });

  test('refuses an active duplicate invitation', async () => {
    TeamInvitation.findOne.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.createInvitation({
      tenant,
      actor,
      email: 'invitee@example.com',
      role: 'user',
    })).rejects.toMatchObject({ code: 'INVITATION_ALREADY_PENDING', statusCode: 409 });
  });

  test('turns a concurrent duplicate into a business conflict', async () => {
    TeamInvitation.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    await expect(service.createInvitation({
      tenant,
      actor,
      email: 'invitee@example.com',
      role: 'user',
    })).rejects.toMatchObject({ code: 'INVITATION_ALREADY_PENDING', statusCode: 409 });
    expect(emailService.sendTeamInvitation).not.toHaveBeenCalled();
  });

  test('accepts a valid invitation once in a transaction', async () => {
    const invitation = {
      email: 'invitee@example.com',
      role: 'user',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
      update: jest.fn(),
    };
    const user = { toJSON: () => ({ id: 'user-1', email: invitation.email }) };
    TeamInvitation.findOne.mockResolvedValue(invitation);
    User.create.mockResolvedValue(user);

    const result = await service.acceptInvitation({
      tenantId: tenant.id,
      token: 'a'.repeat(64),
      firstName: 'Grace',
      lastName: 'Hopper',
      password: 'Secret123!',
    });

    expect(TeamInvitation.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: tenant.id }),
      lock: 'UPDATE',
    }));
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenant.id,
      role: 'user',
    }), { transaction });
    expect(invitation.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted',
    }), { transaction });
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toEqual({ id: 'user-1', email: invitation.email });
  });

  describe('acceptation et vérification', () => {
    const pendingInvitation = () => ({
      tenantId: tenant.id,
      email: 'invitee@example.com',
      role: 'user',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
      invitedBy: 'owner-1',
      update: jest.fn(),
    });

    const accept = () => service.acceptInvitation({
      tenantId: tenant.id,
      token: 'a'.repeat(64),
      firstName: 'Grace',
      lastName: 'Hopper',
      password: 'Secret123!',
    });

    test('marks the new member as verified — the invitation proves ownership', async () => {
      TeamInvitation.findOne.mockResolvedValue(pendingInvitation());
      User.create.mockResolvedValue({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'invitee@example.com',
        toJSON: () => ({ id: 'user-1' }),
      });

      await accept();

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        { transaction }
      );
    });

    test('notifies the inviter after the transaction commits', async () => {
      TeamInvitation.findOne.mockResolvedValue(pendingInvitation());
      User.create.mockResolvedValue({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'invitee@example.com',
        toJSON: () => ({ id: 'user-1' }),
      });
      // 1er appel : assertEmailAvailable ; 2e : recherche de l'invitant
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          tenant: { name: 'Acme' },
        });

      await accept();

      expect(transaction.commit).toHaveBeenCalled();
      expect(emailService.sendInvitationAccepted).toHaveBeenCalledWith(expect.objectContaining({
        email: 'ada@example.com',
        inviterName: 'Ada Lovelace',
        memberName: 'Grace Hopper',
        memberEmail: 'invitee@example.com',
        tenantName: 'Acme',
      }));
    });

    test('a failing notification never fails the acceptance', async () => {
      TeamInvitation.findOne.mockResolvedValue(pendingInvitation());
      User.create.mockResolvedValue({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'invitee@example.com',
        toJSON: () => ({ id: 'user-1' }),
      });
      User.findOne
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB down'));

      await expect(accept()).resolves.toEqual({ id: 'user-1' });
      expect(transaction.commit).toHaveBeenCalled();
      expect(transaction.rollback).not.toHaveBeenCalled();
    });

    // L'état de l'entreprise à l'acceptation est couvert par
    // `teamInvitationService.tenantStatus.test.js`.
  });

  test.each([
    ['expired', { status: 'pending', expiresAt: new Date(Date.now() - 60_000) }, 'INVITATION_EXPIRED'],
    ['used', { status: 'accepted', expiresAt: new Date(Date.now() + 60_000) }, 'INVITATION_INVALID'],
    ['revoked', { status: 'revoked', expiresAt: new Date(Date.now() + 60_000) }, 'INVITATION_INVALID'],
  ])('rejects an %s invitation', async (_label, invitation, code) => {
    TeamInvitation.findOne.mockResolvedValue(invitation);
    await expect(service.acceptInvitation({
      tenantId: tenant.id,
      token: 'b'.repeat(64),
      firstName: 'Test',
      lastName: 'User',
      password: 'Secret123!',
    })).rejects.toMatchObject({ code });
    expect(transaction.rollback).toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });
});
