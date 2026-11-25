// `POST /api/auth/invitations/accept` est public et monté hors
// `extractTenantFromRequest` : rien d'autre ne vérifie l'état de l'entreprise.
// Sans cette garde, une entreprise bloquée continuerait de gagner des membres.
jest.mock('../models', () => ({
  TeamInvitation: { findOne: jest.fn(), create: jest.fn() },
  User: { findOne: jest.fn(), create: jest.fn() },
  Tenant: { findOne: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));

jest.mock('./emailService', () => ({
  sendTeamInvitation: jest.fn(),
  sendInvitationAccepted: jest.fn(),
}));
jest.mock('./quotaService', () => ({ assertCanAddMember: jest.fn() }));

const { TeamInvitation, User, Tenant, sequelize } = require('../models');
const service = require('./teamInvitationService');

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

describe('teamInvitationService — état de l’entreprise à l’acceptation', () => {
  let transaction;

  const pendingInvitation = () => ({
    id: 'invite-1',
    tenantId: TENANT_ID,
    email: 'invitee@example.com',
    role: 'user',
    status: 'pending',
    permissionOverrides: {},
    expiresAt: new Date(Date.now() + 60_000),
    invitedBy: 'owner-1',
    update: jest.fn(),
  });

  const accept = () => service.acceptInvitation({
    tenantId: TENANT_ID,
    token: 'a'.repeat(64),
    firstName: 'Grace',
    lastName: 'Hopper',
    password: 'Secret123!',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockResolvedValue(transaction);
    TeamInvitation.findOne.mockResolvedValue(pendingInvitation());
    User.findOne.mockResolvedValue(null);
    Tenant.findOne.mockResolvedValue({ id: TENANT_ID, name: 'Acme' });
    User.create.mockResolvedValue({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'invitee@example.com',
      toJSON: () => ({ id: 'user-1' }),
    });
  });

  test('refuses to join a blocked or deleted company', async () => {
    Tenant.findOne.mockResolvedValue(null);

    await expect(accept()).rejects.toMatchObject({
      statusCode: 403,
      code: 'TENANT_INACTIVE',
    });

    expect(User.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  // La garde doit partager la transaction qui verrouille déjà l'invitation :
  // hors transaction, un blocage concurrent passerait entre les mailles.
  test('checks the company inside the transaction that locks the invitation', async () => {
    await accept();

    expect(Tenant.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: TENANT_ID, isActive: true },
      transaction,
    }));
  });

  test('lets an active company accept its invitation', async () => {
    await expect(accept()).resolves.toEqual({ id: 'user-1' });

    expect(User.create).toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
  });

  /**
   * Le verrou porte sur la LIGNE DU TENANT, pas seulement sur l'invitation :
   * deux invités acceptant en même temps verrouillent des invitations
   * différentes et franchiraient sinon tous deux la limite de sièges.
   */
  test('locks the tenant row so concurrent accepts cannot both pass', async () => {
    await accept();

    expect(Tenant.findOne).toHaveBeenCalledWith(expect.objectContaining({
      lock: 'UPDATE',
      transaction,
    }));
  });
});
