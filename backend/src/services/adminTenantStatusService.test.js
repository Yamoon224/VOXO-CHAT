jest.mock('./adminTenantService', () => ({
  findTenantOrFail: jest.fn(),
  findOwner: jest.fn(),
  getTenantDetail: jest.fn(),
}));
jest.mock('./tenantDeletionService', () => ({ cleanupExternalChannels: jest.fn() }));
jest.mock('./emailService', () => ({ sendBestEffort: jest.fn() }));
jest.mock('../models', () => ({
  Plan: { findOne: jest.fn() },
}));

const tenantService = require('./adminTenantService');
const tenantDeletionService = require('./tenantDeletionService');
const emailService = require('./emailService');
const { Plan } = require('../models');
const service = require('./adminTenantStatusService');

const buildTenant = (overrides = {}) => ({
  id: 'tenant-1',
  name: 'Neo bureau',
  isActive: true,
  subscriptionPlan: 'free',
  settings: {
    features: { leadGeneration: false, analytics: true, customBranding: false },
    channels: {
      telegram: { botToken: 'token', webhookActive: true },
      whatsapp: { sessionId: 'session-1', webhookActive: true },
    },
  },
  update: jest.fn(),
  ...overrides,
});

describe('adminTenantStatusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Plan.findOne.mockImplementation(async ({ where }) => (
      where.name === 'platine' ? null : { name: where.name }
    ));
    tenantService.findOwner.mockResolvedValue({ email: 'owner@voxochat.com', firstName: 'Guy' });
    tenantService.getTenantDetail.mockResolvedValue({ id: 'tenant-1' });
    emailService.sendBestEffort.mockResolvedValue(true);
  });

  describe('setStatus — blocage', () => {
    test('disconnects external channels before deactivating', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.setStatus({ tenantId: 'tenant-1', isActive: false });

      expect(tenantDeletionService.cleanupExternalChannels).toHaveBeenCalledWith(tenant);
      const [payload] = tenant.update.mock.calls[0];
      expect(payload.isActive).toBe(false);
    });

    test('reflects the disconnection in settings instead of leaving them stale', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.setStatus({ tenantId: 'tenant-1', isActive: false });

      const [{ settings }] = tenant.update.mock.calls[0];
      expect(settings.channels.telegram.webhookActive).toBe(false);
      expect(settings.channels.whatsapp.webhookActive).toBe(false);
    });

    // Sequelize ne détecte pas une mutation interne d'un JSONB : si l'objet
    // d'origine était muté au lieu d'être remplacé, rien ne serait persisté.
    test('passes a new settings object, never the original reference', async () => {
      const tenant = buildTenant();
      const original = tenant.settings;
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.setStatus({ tenantId: 'tenant-1', isActive: false });

      const [{ settings }] = tenant.update.mock.calls[0];
      expect(settings).not.toBe(original);
      expect(original.channels.telegram.webhookActive).toBe(true);
    });

    test('notifies the owner that the company was suspended', async () => {
      tenantService.findTenantOrFail.mockResolvedValue(buildTenant());

      await service.setStatus({ tenantId: 'tenant-1', isActive: false });

      expect(emailService.sendBestEffort).toHaveBeenCalledWith(expect.objectContaining({
        to: 'owner@voxochat.com',
        template: 'tenantSuspended',
      }));
    });

    test('still blocks when the tenant has no channels configured', async () => {
      const tenant = buildTenant({ settings: { features: {} } });
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.setStatus({ tenantId: 'tenant-1', isActive: false });

      expect(tenant.update).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      const tenant = buildTenant({ isActive: false });
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await expect(service.setStatus({ tenantId: 'tenant-1', isActive: false }))
        .rejects.toMatchObject({ statusCode: 409, code: 'TENANT_ALREADY_INACTIVE' });

      expect(tenant.update).not.toHaveBeenCalled();
    });
  });

  describe('setStatus — déblocage', () => {
    test('reactivates without touching external channels', async () => {
      const tenant = buildTenant({ isActive: false });
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.setStatus({ tenantId: 'tenant-1', isActive: true });

      expect(tenant.update).toHaveBeenCalledWith({ isActive: true });
      expect(tenantDeletionService.cleanupExternalChannels).not.toHaveBeenCalled();
      expect(emailService.sendBestEffort).toHaveBeenCalledWith(expect.objectContaining({
        template: 'tenantReactivated',
      }));
    });

    test('rejects reactivating an already active company', async () => {
      tenantService.findTenantOrFail.mockResolvedValue(buildTenant());

      await expect(service.setStatus({ tenantId: 'tenant-1', isActive: true }))
        .rejects.toMatchObject({ statusCode: 409, code: 'TENANT_ALREADY_ACTIVE' });
    });
  });

  describe('updatePlan', () => {
    test('changes only the plan', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.updatePlan({ tenantId: 'tenant-1', subscriptionPlan: 'enterprise' });

      expect(tenant.update).toHaveBeenCalledWith({ subscriptionPlan: 'enterprise' });
    });

    /**
     * Les caractéristiques ne sont plus recopiées dans `settings` : elles sont
     * dérivées du forfait à la lecture, ce qui supprime tout risque de décalage
     * après l'édition d'un forfait.
     */
    test('never writes features into settings anymore', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.updatePlan({ tenantId: 'tenant-1', subscriptionPlan: 'pro' });

      const [payload] = tenant.update.mock.calls[0];
      expect(payload).not.toHaveProperty('settings');
    });

    test('records a subscription expiry when one is provided', async () => {
      const tenant = buildTenant();
      const expiresAt = new Date('2027-01-01T00:00:00Z');
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.updatePlan({
        tenantId: 'tenant-1', subscriptionPlan: 'pro', subscriptionExpiresAt: expiresAt,
      });

      expect(tenant.update).toHaveBeenCalledWith({
        subscriptionPlan: 'pro', subscriptionExpiresAt: expiresAt,
      });
    });

    // Prolonger un abonnement sans changer de palier est une opération légitime.
    test('allows changing only the expiry on an unchanged plan', async () => {
      const tenant = buildTenant();
      const expiresAt = new Date('2027-01-01T00:00:00Z');
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await service.updatePlan({
        tenantId: 'tenant-1', subscriptionPlan: 'free', subscriptionExpiresAt: expiresAt,
      });

      expect(tenant.update).toHaveBeenCalled();
    });

    test('rejects an unknown plan', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await expect(service.updatePlan({ tenantId: 'tenant-1', subscriptionPlan: 'platine' }))
        .rejects.toMatchObject({ statusCode: 400, code: 'TENANT_PLAN_UNKNOWN' });

      expect(tenant.update).not.toHaveBeenCalled();
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      const tenant = buildTenant();
      tenantService.findTenantOrFail.mockResolvedValue(tenant);

      await expect(service.updatePlan({ tenantId: 'tenant-1', subscriptionPlan: 'free' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'TENANT_PLAN_UNCHANGED' });
    });
  });
});
