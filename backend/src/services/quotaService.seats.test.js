jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(fn => fn('tx')), query: jest.fn() },
  TenantUsage: { findOne: jest.fn() },
  KnowledgeBase: { count: jest.fn() },
  User: { count: jest.fn() },
  TeamInvitation: { count: jest.fn() },
}));
jest.mock('./planService', () => ({ getLimits: jest.fn() }));

const { Op } = require('sequelize');
const { User, TeamInvitation } = require('../models');
const planService = require('./planService');
const quotaService = require('./quotaService');

describe('quotaService — sièges', () => {
  const tenant = { id: 'tenant-1', subscriptionPlan: 'basic' };

  const seats = (members, invitations) => {
    User.count.mockResolvedValue(members);
    TeamInvitation.count.mockResolvedValue(invitations);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: null, messagesPerDay: null, maxUsers: 3, activeDocuments: null,
    });
  });

  test('allows adding a member while a seat is free', async () => {
    seats(1, 1);

    await expect(quotaService.assertCanAddMember(tenant, 1)).resolves.toMatchObject({
      used: 2, limit: 3, remaining: 1,
    });
  });

  test('blocks once every seat is taken', async () => {
    seats(2, 1);

    await expect(quotaService.assertCanAddMember(tenant, 1)).rejects.toMatchObject({
      statusCode: 403,
      code: 'QUOTA_EXCEEDED',
      details: { resource: 'member', limit: 3, used: 3 },
    });
  });

  /**
   * Les invitations en attente occupent un siège : sans cela, N invitations
   * envoyées d'un coup franchiraient toutes la limite à l'acceptation.
   */
  test('counts pending invitations as occupied seats', async () => {
    seats(1, 2);

    await expect(quotaService.assertCanAddMember(tenant, 1)).rejects.toMatchObject({
      details: { used: 3 },
    });
  });

  test('ignores expired and revoked invitations', async () => {
    seats(1, 0);

    await quotaService.assertCanAddMember(tenant, 1);

    expect(TeamInvitation.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'pending',
        expiresAt: { [Op.gt]: expect.any(Date) },
      }),
    }));
  });

  test('counts only active members — a blocked one frees its seat', async () => {
    seats(1, 0);

    await quotaService.assertCanAddMember(tenant, 1);

    expect(User.count).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1', isActive: true },
    }));
  });

  // Utilisé à l'acceptation d'une invitation : le siège est déjà compté, on
  // vérifie seulement que le total tient dans la limite courante.
  test('accepts amount 0 to re-check an already reserved seat', async () => {
    seats(2, 1);

    await expect(quotaService.assertCanAddMember(tenant, 0)).resolves.toMatchObject({
      limit: 3,
    });
    expect(User.count).not.toHaveBeenCalled();
  });

  test('never queries when the plan has no seat limit', async () => {
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
    });

    await quotaService.assertCanAddMember(tenant, 1);

    expect(User.count).not.toHaveBeenCalled();
    expect(TeamInvitation.count).not.toHaveBeenCalled();
  });

  // La transaction de l'acceptation doit être propagée au décompte, sinon il
  // lirait hors du verrou pris sur le tenant.
  test('propagates the caller transaction to the counts', async () => {
    seats(1, 0);

    await quotaService.assertCanAddMember(tenant, 1, { transaction: 'tx' });

    expect(User.count).toHaveBeenCalledWith(expect.objectContaining({ transaction: 'tx' }));
    expect(TeamInvitation.count).toHaveBeenCalledWith(expect.objectContaining({ transaction: 'tx' }));
  });
});
