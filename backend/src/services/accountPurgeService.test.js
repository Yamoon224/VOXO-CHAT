// La purge est la seule opération qui efface physiquement des données : elle
// doit viser exactement les lignes expirées, lever les FK qui la bloqueraient,
// et rester rejouable sans dégât.
jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn() },
  User: { findAll: jest.fn() },
  Tenant: { findAll: jest.fn() },
  TeamInvitation: { destroy: jest.fn() },
  KnowledgeBase: { update: jest.fn() },
  CrawlJob: { update: jest.fn() },
}));
jest.mock('./tenantDeletionService', () => ({ deleteTenantData: jest.fn() }));
jest.mock('../utils/channelLogger', () => ({ logChannelEvent: jest.fn() }));

const { Op } = require('sequelize');
const models = require('../models');
const tenantDeletionService = require('./tenantDeletionService');
const { logChannelEvent } = require('../utils/channelLogger');
const service = require('./accountPurgeService');

const NOW = new Date('2026-08-06T12:00:00.000Z');
const EXPECTED_CUTOFF = new Date('2026-07-07T12:00:00.000Z');

function buildUser(id) {
  return { id, tenantId: 'tenant-1', destroy: jest.fn().mockResolvedValue(1) };
}

describe('accountPurgeService', () => {
  const transaction = { id: 'transaction' };

  beforeEach(() => {
    jest.clearAllMocks();
    models.sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    models.User.findAll.mockResolvedValue([]);
    models.Tenant.findAll.mockResolvedValue([]);
  });

  test('targets only rows soft deleted more than 30 days ago', async () => {
    const report = await service.purgeExpired(NOW);

    for (const model of [models.Tenant, models.User]) {
      expect(model.findAll).toHaveBeenCalledWith(expect.objectContaining({
        // Sans `paranoid: false`, les lignes à purger sont justement invisibles.
        paranoid: false,
        where: { deletedAt: { [Op.lte]: EXPECTED_CUTOFF } },
      }));
    }
    expect(report).toMatchObject({ retentionDays: 30, tenantsPurged: 0, usersPurged: 0, errors: [] });
  });

  test('purges expired tenants physically', async () => {
    const tenant = { id: 'tenant-1' };
    models.Tenant.findAll.mockResolvedValue([tenant]);

    const report = await service.purgeExpired(NOW);

    expect(tenantDeletionService.deleteTenantData).toHaveBeenCalledWith(tenant, { force: true });
    expect(report.tenantsPurged).toBe(1);
  });

  test('detaches a user from what they created before erasing them', async () => {
    const user = buildUser('user-1');
    models.User.findAll.mockResolvedValue([user]);

    const report = await service.purgeExpired(NOW);

    // `invited_by` est NOT NULL + ON DELETE RESTRICT : impossible à détacher.
    expect(models.TeamInvitation.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { invitedBy: 'user-1' }, force: true, transaction })
    );
    // Le contenu appartient à l'entreprise, il survit à son auteur.
    expect(models.KnowledgeBase.update).toHaveBeenCalledWith(
      { createdBy: null },
      expect.objectContaining({ where: { createdBy: 'user-1' }, transaction })
    );
    expect(models.CrawlJob.update).toHaveBeenCalledWith(
      { createdBy: null },
      expect.objectContaining({ where: { createdBy: 'user-1' }, transaction })
    );
    expect(user.destroy).toHaveBeenCalledWith({ force: true, transaction });
    expect(report.usersPurged).toBe(1);
  });

  test('one failure does not abort the whole run', async () => {
    const failing = buildUser('user-1');
    failing.destroy.mockRejectedValue(new Error('FK violation'));
    const healthy = buildUser('user-2');
    models.User.findAll.mockResolvedValue([failing, healthy]);

    const report = await service.purgeExpired(NOW);

    expect(report.usersPurged).toBe(1);
    expect(report.errors).toEqual([
      expect.objectContaining({ type: 'user', id: 'user-1', message: 'FK violation' }),
    ]);
    expect(logChannelEvent).toHaveBeenCalledWith(
      'error',
      'account.purge_user_failed',
      expect.objectContaining({ userId: 'user-1' })
    );
  });

  test('is idempotent: a second run finds nothing left', async () => {
    models.Tenant.findAll.mockResolvedValueOnce([{ id: 'tenant-1' }]).mockResolvedValue([]);

    const first = await service.purgeExpired(NOW);
    const second = await service.purgeExpired(NOW);

    expect(first.tenantsPurged).toBe(1);
    expect(second).toMatchObject({ tenantsPurged: 0, usersPurged: 0, errors: [] });
  });
});
