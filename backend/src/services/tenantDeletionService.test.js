jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn() },
  User: { destroy: jest.fn() },
  KnowledgeBase: { destroy: jest.fn() },
  KnowledgeChunk: { destroy: jest.fn() },
  Conversation: { destroy: jest.fn() },
  TenantUsage: { destroy: jest.fn() },
  CrawlJob: { destroy: jest.fn() },
  TeamInvitation: { destroy: jest.fn() },
  MessageAttachment: { destroy: jest.fn() },
}));
jest.mock('./storageService', () => ({
  isConfigured: jest.fn(() => false),
  removeTenantPrefix: jest.fn(),
}));
jest.mock('./telegramService', () => ({ deleteWebhook: jest.fn() }));
jest.mock('./whatsappService', () => ({ listWebhooks: jest.fn(), deleteWebhook: jest.fn() }));
jest.mock('../utils/channelLogger', () => ({ logChannelEvent: jest.fn() }));

const models = require('../models');
const telegramService = require('./telegramService');
const whatsappService = require('./whatsappService');
const { logChannelEvent } = require('../utils/channelLogger');
const service = require('./tenantDeletionService');

describe('tenantDeletionService', () => {
  const transaction = { id: 'transaction' };

  beforeEach(() => {
    jest.clearAllMocks();
    models.sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    for (const model of [
      models.User,
      models.KnowledgeBase,
      models.KnowledgeChunk,
      models.Conversation,
      models.TenantUsage,
      models.CrawlJob,
      models.TeamInvitation,
      models.MessageAttachment,
    ]) {
      model.destroy.mockResolvedValue(1);
    }
  });

  test('deletes every tenant-owned model in one transaction', async () => {
    const tenant = { id: 'tenant-1', settings: {}, destroy: jest.fn().mockResolvedValue(1) };

    await service.deleteTenant(tenant);

    const expectedOptions = { where: { tenantId: 'tenant-1' }, transaction };
    expect(models.KnowledgeChunk.destroy).toHaveBeenCalledWith(expectedOptions);
    expect(models.KnowledgeBase.destroy).toHaveBeenCalledWith(expectedOptions);
    expect(models.CrawlJob.destroy).toHaveBeenCalledWith(expectedOptions);
    expect(models.MessageAttachment.destroy).toHaveBeenCalledWith(expectedOptions);
    expect(models.Conversation.destroy).toHaveBeenCalledWith(expectedOptions);
    expect(models.TenantUsage.destroy).toHaveBeenCalledWith(expectedOptions);
    // `invited_by` est en ON DELETE RESTRICT : les invitations partent avant leurs auteurs.
    expect(models.TeamInvitation.destroy).toHaveBeenCalledWith({
      ...expectedOptions,
      force: true,
    });
    expect(models.User.destroy).toHaveBeenCalledWith({ ...expectedOptions, force: true });
    expect(tenant.destroy).toHaveBeenCalledWith({ force: true, transaction });
  });

  test('purge les fichiers du tenant après la suppression en base', async () => {
    const storageService = require('./storageService');
    storageService.isConfigured.mockReturnValue(true);
    storageService.removeTenantPrefix.mockResolvedValue(3);
    const tenant = { id: 'tenant-1', settings: {}, destroy: jest.fn().mockResolvedValue(1) };

    await service.deleteTenant(tenant);

    expect(storageService.removeTenantPrefix).toHaveBeenCalledWith('tenant-1');
  });

  test("un échec du stockage n'annule pas la suppression en base", async () => {
    const storageService = require('./storageService');
    storageService.isConfigured.mockReturnValue(true);
    storageService.removeTenantPrefix.mockRejectedValue(new Error('bucket injoignable'));
    const tenant = { id: 'tenant-1', settings: {}, destroy: jest.fn().mockResolvedValue(1) };

    await expect(service.deleteTenant(tenant)).resolves.toBeUndefined();

    expect(tenant.destroy).toHaveBeenCalled();
    expect(logChannelEvent).toHaveBeenCalledWith(
      'error',
      'tenant.deletion_files_failed',
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
  });

  test('force is mandatory: paranoid models would otherwise only be soft deleted', async () => {
    const tenant = { id: 'tenant-1', settings: {}, destroy: jest.fn().mockResolvedValue(1) };

    await service.deleteTenantData(tenant, { force: false });

    expect(models.User.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ force: false })
    );
    expect(tenant.destroy).toHaveBeenCalledWith({ force: false, transaction });
  });

  test('external cleanup failures are logged and do not block database deletion', async () => {
    const externalError = new Error('provider unavailable');
    telegramService.deleteWebhook.mockRejectedValue(externalError);
    whatsappService.listWebhooks.mockResolvedValue([]);
    const tenant = {
      id: 'tenant-1',
      settings: {
        channels: {
          telegram: { botToken: 'secret', webhookActive: true },
          whatsapp: { sessionId: 'session-1', webhookActive: true },
        },
      },
      destroy: jest.fn().mockResolvedValue(1),
    };

    await expect(service.deleteTenant(tenant)).resolves.toBeUndefined();

    expect(logChannelEvent).toHaveBeenCalledWith(
      'error',
      'tenant.deletion_channel_disconnect_failed',
      expect.objectContaining({ tenantId: 'tenant-1', channel: 'telegram', error: externalError })
    );
    expect(tenant.destroy).toHaveBeenCalledWith({ force: true, transaction });
  });

});
