// Quota journalier et échéance de forfait : deux comportements ajoutés en même
// temps que les forfaits en base, tous deux invisibles pour l'ancien service.
jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(fn => fn('tx')), query: jest.fn() },
  TenantUsage: { findOne: jest.fn() },
  KnowledgeBase: { count: jest.fn() },
  User: { count: jest.fn() },
  TeamInvitation: { count: jest.fn() },
}));
jest.mock('./planService', () => ({ getLimits: jest.fn() }));

const { TenantUsage } = require('../models');
const planService = require('./planService');
const quotaService = require('./quotaService');

const usageByResource = (byResource) => {
  TenantUsage.findOne.mockImplementation(async ({ where }) => {
    const used = byResource[where.resourceType];
    return used === undefined ? null : { used };
  });
};

describe('quotaService — quota journalier', () => {
  const tenant = { id: 'tenant-1', subscriptionPlan: 'basic' };

  beforeEach(() => {
    jest.clearAllMocks();
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: 500, messagesPerDay: 10, maxUsers: null, activeDocuments: null,
    });
  });

  test('allows a message below both limits', async () => {
    usageByResource({ message: 100, message_daily: 5 });

    await expect(quotaService.assertCanSendMessage(tenant)).resolves.toMatchObject({
      used: 100, limit: 500,
    });
  });

  // Le cas qui justifie tout le quota journalier : loin du plafond mensuel,
  // mais au bout de la réserve du jour.
  test('blocks on the daily limit even when the monthly one is far away', async () => {
    usageByResource({ message: 100, message_daily: 10 });

    await expect(quotaService.assertCanSendMessage(tenant)).rejects.toMatchObject({
      statusCode: 403,
      code: 'QUOTA_EXCEEDED',
      details: { resource: 'message_daily', limit: 10, used: 10 },
    });
  });

  test('blocks on the monthly limit before even looking at the day', async () => {
    usageByResource({ message: 500, message_daily: 0 });

    await expect(quotaService.assertCanSendMessage(tenant)).rejects.toMatchObject({
      details: { resource: 'message' },
    });
  });

  /**
   * Sans court-circuit par limite, un forfait au mensuel illimité échapperait
   * aussi à son plafond quotidien — exactement l'inverse de l'effet voulu.
   */
  test('applies the daily cap even when the monthly one is unlimited', async () => {
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: null, messagesPerDay: 3, maxUsers: null, activeDocuments: null,
    });
    usageByResource({ message_daily: 3 });

    await expect(quotaService.assertCanSendMessage(tenant)).rejects.toMatchObject({
      details: { resource: 'message_daily', limit: 3 },
    });
  });

  test('reads no counter at all when both limits are unlimited', async () => {
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
    });

    await quotaService.assertCanSendMessage(tenant);

    expect(TenantUsage.findOne).not.toHaveBeenCalled();
  });
});

describe('quotaService — échéance du forfait', () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  beforeEach(() => {
    jest.clearAllMocks();
    planService.getLimits.mockResolvedValue({
      messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
    });
  });

  test('keeps the paid plan while the subscription is still valid', () => {
    expect(quotaService.getPlanName({ subscriptionPlan: 'pro', subscriptionExpiresAt: future }))
      .toBe('pro');
  });

  // Sans cela, un abonnement expiré conserverait indéfiniment ses limites.
  test('falls back to the default plan once the subscription expired', () => {
    expect(quotaService.getPlanName({ subscriptionPlan: 'pro', subscriptionExpiresAt: past }))
      .toBe('free');
  });

  test('treats an absent expiry as no expiry', () => {
    expect(quotaService.getPlanName({ subscriptionPlan: 'enterprise' })).toBe('enterprise');
  });

  test('applies the fallback plan when resolving limits', async () => {
    await quotaService.assertCanSendMessage({
      id: 'tenant-1', subscriptionPlan: 'pro', subscriptionExpiresAt: past,
    });

    expect(planService.getLimits).toHaveBeenCalledWith('free');
  });
});
