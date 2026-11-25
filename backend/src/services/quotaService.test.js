jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(fn => fn('tx')), query: jest.fn() },
  TenantUsage: { findOne: jest.fn() },
  KnowledgeBase: { count: jest.fn() },
  User: { count: jest.fn() },
  TeamInvitation: { count: jest.fn() },
}));
jest.mock('./planService', () => ({ getLimits: jest.fn() }));

const { sequelize, TenantUsage, KnowledgeBase } = require('../models');
const planService = require('./planService');
const quotaService = require('./quotaService');

const LIMITS = {
  free: {
    messagesPerMonth: 100, messagesPerDay: null, maxUsers: null, activeDocuments: 3,
  },
  pro: {
    messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
  },
};

describe('quotaService', () => {
  const freeTenant = { id: 'tenant-free', subscriptionPlan: 'free' };
  const proTenant = { id: 'tenant-pro', subscriptionPlan: 'pro' };

  beforeEach(() => {
    jest.clearAllMocks();
    planService.getLimits.mockImplementation(async name => LIMITS[name] || LIMITS.free);
    sequelize.transaction.mockImplementation(fn => fn('tx'));
  });

  test('allows a free tenant below the monthly message limit', async () => {
    TenantUsage.findOne.mockResolvedValue({ used: 99 });

    await expect(quotaService.assertCanSendMessage(freeTenant)).resolves.toMatchObject({
      used: 99, limit: 100, remaining: 1, unlimited: false,
    });
  });

  test('blocks a free tenant at the monthly message limit', async () => {
    TenantUsage.findOne.mockResolvedValue({ used: 100 });

    await expect(quotaService.assertCanSendMessage(freeTenant)).rejects.toMatchObject({
      statusCode: 403,
      code: 'QUOTA_EXCEEDED',
      details: {
        resource: 'message', plan: 'free', limit: 100, used: 100, remaining: 0,
      },
    });
  });

  // Le court-circuit « illimité » doit rester : une limite nulle ne doit
  // déclencher aucune lecture de compteur sur le chemin chaud.
  test('allows pro tenants without reading message usage', async () => {
    await expect(quotaService.assertCanSendMessage(proTenant)).resolves.toMatchObject({
      limit: null, remaining: null, unlimited: true,
    });

    expect(TenantUsage.findOne).not.toHaveBeenCalled();
  });

  test('blocks active document creation when free tenant reaches document limit', async () => {
    KnowledgeBase.count.mockResolvedValue(3);

    await expect(quotaService.assertCanCreateDocuments(freeTenant)).rejects.toMatchObject({
      statusCode: 403,
      code: 'QUOTA_EXCEEDED',
      details: {
        resource: 'document', plan: 'free', limit: 3, used: 3, remaining: 0,
      },
    });
  });

  test('does not block zero active document operations', async () => {
    await expect(quotaService.assertCanCreateDocuments(freeTenant, 0)).resolves.toMatchObject({
      limit: 3, unlimited: false,
    });

    expect(KnowledgeBase.count).not.toHaveBeenCalled();
  });

  describe('incrementMessageUsage', () => {
    beforeEach(() => {
      sequelize.query.mockResolvedValue([[{ used: 3 }]]);
    });

    test('writes both counters inside a single transaction', async () => {
      await expect(quotaService.incrementMessageUsage('tenant-free')).resolves.toBe(3);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(sequelize.query).toHaveBeenCalledTimes(2);

      const resources = sequelize.query.mock.calls.map(([, options]) => options.replacements.resourceType);
      expect(resources).toEqual(expect.arrayContaining(['message', 'message_daily']));
    });

    // L'upsert atomique est ce qui empêche deux messages simultanés de franchir
    // ensemble la limite : la lecture-puis-écriture d'avant ne le garantissait pas.
    test('uses an atomic upsert rather than read-then-write', async () => {
      await quotaService.incrementMessageUsage('tenant-free', 2);

      const [sql, options] = sequelize.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('RETURNING used');
      expect(options.replacements.amount).toBe(2);
      expect(options.transaction).toBe('tx');
    });

    test('uses a monthly key for message and a daily key for message_daily', async () => {
      await quotaService.incrementMessageUsage('tenant-free');

      const byResource = Object.fromEntries(
        sequelize.query.mock.calls.map(([, o]) => [o.replacements.resourceType, o.replacements.periodKey])
      );
      expect(byResource.message).toMatch(/^\d{4}-\d{2}$/);
      expect(byResource.message_daily).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('period keys', () => {
    test('derives both keys from the same UTC instant', () => {
      const date = new Date('2026-08-19T23:30:00Z');

      expect(quotaService.getCurrentPeriodKey(date)).toBe('2026-08');
      expect(quotaService.getCurrentDayKey(date)).toBe('2026-08-19');
    });
  });
});
