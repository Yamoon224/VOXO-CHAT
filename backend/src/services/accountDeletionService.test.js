// La suppression de compte est irréversible et peut emporter une entreprise
// entière : ces tests verrouillent les garde-fous (mot de passe, transfert de
// propriété obligatoire, confirmation explicite) avant toute écriture en base.
jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn() },
  User: { findAll: jest.fn(), count: jest.fn(), destroy: jest.fn() },
  Tenant: { findByPk: jest.fn() },
  AuthToken: { destroy: jest.fn() },
  TeamInvitation: { update: jest.fn() },
  KnowledgeBase: { count: jest.fn() },
  Conversation: { count: jest.fn() },
}));
jest.mock('./tenantDeletionService', () => ({ cleanupExternalChannels: jest.fn() }));
jest.mock('./accountDeletionNotifier', () => ({
  notifySelfDeletion: jest.fn(),
  notifyMemberRemoved: jest.fn(),
  notifyOwnershipTransfer: jest.fn(),
}));

const models = require('../models');
const tenantDeletionService = require('./tenantDeletionService');
const notifier = require('./accountDeletionNotifier');
const service = require('./accountDeletionService');

const TENANT = { id: 'tenant-1', name: 'Acme', destroy: jest.fn() };

function buildUser(overrides = {}) {
  return {
    id: 'user-1',
    tenantId: TENANT.id,
    role: 'user',
    email: 'user@acme.test',
    firstName: 'Alice',
    tenant: TENANT,
    comparePassword: jest.fn().mockResolvedValue(true),
    destroy: jest.fn(),
    ...overrides,
  };
}

function buildMember(id, role = 'user') {
  return { id, role, firstName: 'Bob', lastName: 'B', email: `${id}@acme.test`, update: jest.fn() };
}

describe('accountDeletionService', () => {
  const transaction = { id: 'transaction' };

  beforeEach(() => {
    jest.clearAllMocks();
    models.sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    models.User.findAll.mockResolvedValue([]);
    models.User.count.mockResolvedValue(1);
    models.KnowledgeBase.count.mockResolvedValue(0);
    models.Conversation.count.mockResolvedValue(0);
    TENANT.destroy.mockResolvedValue(1);
  });

  test('a wrong password stops everything before any write', async () => {
    const user = buildUser({ comparePassword: jest.fn().mockResolvedValue(false) });

    await expect(service.deleteAccount({ user, currentPassword: 'nope' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PASSWORD' });
    expect(user.destroy).not.toHaveBeenCalled();
  });

  test('a standard member is soft deleted, tokens are destroyed for good', async () => {
    const user = buildUser();

    const result = await service.deleteAccount({ user, currentPassword: 'Secret1!' });

    // `force: true` uniquement sur les jetons : un lien de réinitialisation en
    // circulation ne doit pas survivre au compte.
    expect(models.AuthToken.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: user.id }, force: true })
    );
    expect(user.destroy).toHaveBeenCalledWith({});
    expect(result).toMatchObject({ scope: 'member' });
    expect(result.purgeAt).toBeInstanceOf(Date);
    expect(notifier.notifySelfDeletion).toHaveBeenCalled();
  });

  describe('owner with remaining members', () => {
    test('refuses to delete without designating a successor', async () => {
      const user = buildUser({ role: 'owner' });
      models.User.findAll.mockResolvedValue([buildMember('member-1')]);

      await expect(service.deleteAccount({ user, currentPassword: 'Secret1!' }))
        .rejects.toMatchObject({
          statusCode: 400,
          code: 'OWNER_TRANSFER_REQUIRED',
          details: { eligibleOwners: [expect.objectContaining({ id: 'member-1' })] },
        });
      expect(user.destroy).not.toHaveBeenCalled();
    });

    test('refuses a successor outside the eligible list', async () => {
      const user = buildUser({ role: 'owner' });
      models.User.findAll.mockResolvedValue([buildMember('member-1')]);

      await expect(service.deleteAccount({
        user, currentPassword: 'Secret1!', newOwnerId: 'stranger',
      })).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_NEW_OWNER' });
      expect(user.destroy).not.toHaveBeenCalled();
    });

    test('promotes the successor and leaves, in a single transaction', async () => {
      const user = buildUser({ role: 'owner' });
      const successor = buildMember('member-1', 'admin');
      models.User.findAll.mockResolvedValue([successor]);

      const result = await service.deleteAccount({
        user, currentPassword: 'Secret1!', newOwnerId: 'member-1',
      });

      expect(successor.update).toHaveBeenCalledWith({ role: 'owner' }, { transaction });
      expect(user.destroy).toHaveBeenCalledWith({ transaction });
      expect(result).toMatchObject({ scope: 'member', newOwnerId: 'member-1' });
      expect(notifier.notifyOwnershipTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ newOwner: successor, previousOwner: user })
      );
      expect(tenantDeletionService.cleanupExternalChannels).not.toHaveBeenCalled();
    });

    test('only active and verified members can inherit the company', async () => {
      const user = buildUser({ role: 'owner' });
      await service.getDeletionPreview(user);

      expect(models.User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT.id, isActive: true }),
      }));
      const { where } = models.User.findAll.mock.calls[0][0];
      expect(where.emailVerifiedAt).toBeDefined();
    });
  });

  describe('owner alone', () => {
    test('requires an explicit confirmation and reports the impact', async () => {
      const user = buildUser({ role: 'owner' });
      models.KnowledgeBase.count.mockResolvedValue(12);

      await expect(service.deleteAccount({ user, currentPassword: 'Secret1!' }))
        .rejects.toMatchObject({
          statusCode: 400,
          code: 'COMPANY_DELETION_CONFIRMATION_REQUIRED',
          details: { impact: expect.objectContaining({ knowledgeCount: 12 }) },
        });
      expect(TENANT.destroy).not.toHaveBeenCalled();
    });

    test('soft deletes the whole company and cuts external channels immediately', async () => {
      const user = buildUser({ role: 'owner' });
      models.User.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'user-1' }]);

      const result = await service.deleteAccount({
        user, currentPassword: 'Secret1!', confirmCompanyDeletion: true,
      });

      // Laisser un bot répondre 30 jours au nom d'une entreprise supprimée
      // serait inacceptable : la coupure est immédiate.
      expect(tenantDeletionService.cleanupExternalChannels).toHaveBeenCalledWith(TENANT);
      expect(models.TeamInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'revoked' }),
        expect.objectContaining({ where: { tenantId: TENANT.id, status: 'pending' }, transaction })
      );
      // Soft delete : ni les membres ni le tenant ne partent en `force`.
      expect(models.User.destroy).toHaveBeenCalledWith({ where: { tenantId: TENANT.id }, transaction });
      expect(TENANT.destroy).toHaveBeenCalledWith({ transaction });
      expect(result).toMatchObject({ scope: 'company' });
      expect(notifier.notifySelfDeletion).toHaveBeenCalledWith(
        expect.objectContaining({ companyDeleted: true })
      );
    });
  });

  describe('getDeletionPreview', () => {
    test('a standard member deletes nothing but their own account', async () => {
      const preview = await service.getDeletionPreview(buildUser());

      expect(preview).toMatchObject({
        isOwner: false,
        transferRequired: false,
        willDeleteCompany: false,
        tenantName: 'Acme',
        impact: null,
      });
    });

    test('an owner with members must transfer', async () => {
      models.User.findAll.mockResolvedValue([buildMember('member-1')]);

      const preview = await service.getDeletionPreview(buildUser({ role: 'owner' }));

      expect(preview).toMatchObject({ transferRequired: true, willDeleteCompany: false });
      expect(preview.eligibleOwners).toEqual([expect.objectContaining({ id: 'member-1' })]);
    });

    test('a lone owner is warned that the company goes with them', async () => {
      models.User.count.mockResolvedValue(1);
      models.Conversation.count.mockResolvedValue(42);

      const preview = await service.getDeletionPreview(buildUser({ role: 'owner' }));

      expect(preview).toMatchObject({ transferRequired: false, willDeleteCompany: true });
      expect(preview.impact).toMatchObject({ membersCount: 1, conversationsCount: 42 });
    });
  });
});
