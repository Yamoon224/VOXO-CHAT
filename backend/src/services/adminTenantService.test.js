jest.mock('../models', () => ({
  Tenant: { findAndCountAll: jest.fn(), findByPk: jest.fn() },
  User: { findOne: jest.fn() },
}));
jest.mock('./accountDeletionService', () => ({ countCompanyImpact: jest.fn() }));
jest.mock('./quotaService', () => ({ getQuotaStatus: jest.fn() }));

const { Op } = require('sequelize');
const { Tenant, User } = require('../models');
const accountDeletionService = require('./accountDeletionService');
const quotaService = require('./quotaService');
const service = require('./adminTenantService');

describe('adminTenantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Tenant.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    User.findOne.mockResolvedValue(null);
    accountDeletionService.countCompanyImpact.mockResolvedValue({
      membersCount: 2, knowledgeCount: 5, conversationsCount: 40,
    });
    quotaService.getQuotaStatus.mockResolvedValue({ plan: 'free', messages: { used: 12 } });
  });

  describe('listTenants', () => {
    test('filters by plan and status, and clamps pagination', async () => {
      await service.listTenants({ page: 3, limit: 500, subscriptionPlan: 'pro', status: 'inactive' });

      expect(Tenant.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ subscriptionPlan: 'pro', isActive: false }),
        limit: 100,
        offset: 200,
      }));
    });

    test('searches across name, subdomain and domain', async () => {
      await service.listTenants({ search: '  neo  ' });

      const { where } = Tenant.findAndCountAll.mock.calls[0][0];
      expect(where[Op.or]).toEqual([
        { name: { [Op.iLike]: '%neo%' } },
        { subdomain: { [Op.iLike]: '%neo%' } },
        { domain: { [Op.iLike]: '%neo%' } },
      ]);
    });

    test('does not filter by status when "all" is requested', async () => {
      await service.listTenants({ status: 'all' });

      const { where } = Tenant.findAndCountAll.mock.calls[0][0];
      expect(where).not.toHaveProperty('isActive');
    });
  });

  describe('getTenantDetail', () => {
    const buildTenant = () => ({
      id: 'tenant-1',
      name: 'Neo bureau',
      subscriptionPlan: 'free',
      isActive: true,
      settings: {
        features: { analytics: true },
        channels: {
          telegram: { botToken: 'secret-token', botUsername: 'neo_bot', webhookActive: true },
          whatsapp: { sessionId: 'session-1', accessToken: 'secret-access', webhookActive: false },
        },
      },
    });

    test('rejects an unknown tenant', async () => {
      Tenant.findByPk.mockResolvedValue(null);

      await expect(service.getTenantDetail('nope'))
        .rejects.toMatchObject({ statusCode: 404, code: 'TENANT_NOT_FOUND' });
    });

    test('aggregates volumetry, quotas and channel status', async () => {
      Tenant.findByPk.mockResolvedValue(buildTenant());

      const detail = await service.getTenantDetail('tenant-1');

      expect(detail).toMatchObject({
        id: 'tenant-1',
        name: 'Neo bureau',
        usage: { membersCount: 2, conversationsCount: 40 },
        quotas: { plan: 'free' },
        channels: { telegram: { botUsername: 'neo_bot', webhookActive: true } },
      });
    });

    // Les jetons de canal ne doivent jamais quitter le backend, même vers un
    // administrateur : la fiche passe par `sanitizeChannelStatus`.
    test('never exposes raw channel credentials', async () => {
      Tenant.findByPk.mockResolvedValue(buildTenant());

      const detail = await service.getTenantDetail('tenant-1');

      expect(JSON.stringify(detail)).not.toContain('secret-token');
      expect(JSON.stringify(detail)).not.toContain('secret-access');
      expect(detail.channels.telegram).not.toHaveProperty('botToken');
      expect(detail.channels.telegram.botTokenConfigured).toBe(true);
    });

    test('returns the owner when there is one', async () => {
      Tenant.findByPk.mockResolvedValue(buildTenant());
      User.findOne.mockResolvedValue({
        get: () => ({ id: 'user-1', email: 'owner@voxochat.com', firstName: 'Guy' }),
      });

      const detail = await service.getTenantDetail('tenant-1');

      expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId: 'tenant-1', role: 'owner' },
      }));
      expect(detail.owner).toMatchObject({ email: 'owner@voxochat.com' });
    });

    test('tolerates a tenant without an owner', async () => {
      Tenant.findByPk.mockResolvedValue(buildTenant());

      const detail = await service.getTenantDetail('tenant-1');

      expect(detail.owner).toBeNull();
    });
  });
});
