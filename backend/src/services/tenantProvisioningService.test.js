const TX = { id: 'tx-1' };

jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn((callback) => callback({ id: 'tx-1' })) },
  User: { findOne: jest.fn(), create: jest.fn() },
  Tenant: { findOne: jest.fn(), create: jest.fn() },
}));

const { Op } = require('sequelize');
const { sequelize, User, Tenant } = require('../models');
const tenantProvisioningService = require('./tenantProvisioningService');
const { registerSchema } = require('../validators/authValidators');

const OWNER = {
  companyName: 'Acme',
  firstName: 'Guy',
  lastName: 'Jo',
  email: 'guy@example.com',
  password: 'Test@1234',
};

const catchError = async (promise) => {
  try {
    await promise;
    throw new Error('Aucune erreur levée');
  } catch (error) {
    return error;
  }
};

describe('tenantProvisioningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(null);
    Tenant.findOne.mockResolvedValue(null);
    Tenant.create.mockResolvedValue({ id: 'tenant-1' });
    User.create.mockResolvedValue({ id: 'user-1' });
    sequelize.transaction.mockImplementation((callback) => callback(TX));
  });

  describe('assertAvailability — conflit sur l’email', () => {
    test('un compte non confirmé est signalé comme tel, pour orienter vers le renvoi', async () => {
      User.findOne.mockResolvedValue({ emailVerifiedAt: null, pendingEmail: null });

      const error = await catchError(
        tenantProvisioningService.assertAvailability({ email: OWNER.email })
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_PENDING_VERIFICATION');
      expect(error.details.conflicts).toEqual([
        expect.objectContaining({ field: 'email', code: 'EMAIL_PENDING_VERIFICATION' }),
      ]);
    });

    test('un compte déjà confirmé reste un simple doublon', async () => {
      User.findOne.mockResolvedValue({ emailVerifiedAt: new Date(), pendingEmail: null });

      const error = await catchError(
        tenantProvisioningService.assertAvailability({ email: OWNER.email })
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_ALREADY_USED');
    });

    test('une adresse réservée par un changement en attente est un doublon, pas un compte à confirmer', async () => {
      User.findOne.mockResolvedValue({ emailVerifiedAt: null, pendingEmail: OWNER.email });

      const error = await catchError(
        tenantProvisioningService.assertAvailability({ email: OWNER.email })
      );

      expect(error.code).toBe('EMAIL_ALREADY_USED');
    });

    test('l’adresse est cherchée aussi bien en email qu’en pendingEmail', async () => {
      await tenantProvisioningService.assertAvailability({ email: OWNER.email });

      const [{ where }] = User.findOne.mock.calls[0];
      expect(where[Op.or]).toEqual([
        { email: OWNER.email },
        { pendingEmail: OWNER.email },
      ]);
    });
  });

  describe('assertAvailability — conflit sur le sous-domaine', () => {
    test('un sous-domaine pris est refusé', async () => {
      Tenant.findOne.mockResolvedValue({ id: 'tenant-2' });

      const error = await catchError(
        tenantProvisioningService.assertAvailability({ email: OWNER.email, subdomain: 'acme' })
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('SUBDOMAIN_UNAVAILABLE');
    });

    test('aucun sous-domaine fourni : aucune requête tenant', async () => {
      await tenantProvisioningService.assertAvailability({ email: OWNER.email });

      expect(Tenant.findOne).not.toHaveBeenCalled();
    });
  });

  describe('assertAvailability — conflits multiples', () => {
    test('les deux conflits sont renvoyés d’un coup, l’email portant le code', async () => {
      User.findOne.mockResolvedValue({ emailVerifiedAt: new Date(), pendingEmail: null });
      Tenant.findOne.mockResolvedValue({ id: 'tenant-2' });

      const error = await catchError(
        tenantProvisioningService.assertAvailability({ email: OWNER.email, subdomain: 'acme' })
      );

      expect(error.code).toBe('EMAIL_ALREADY_USED');
      expect(error.details.conflicts).toHaveLength(2);
      expect(error.details.conflicts.map((conflict) => conflict.field)).toEqual([
        'email',
        'subdomain',
      ]);
    });
  });

  describe('createTenantWithOwner', () => {
    test('crée le tenant puis son propriétaire dans une seule transaction', async () => {
      const result = await tenantProvisioningService.createTenantWithOwner({
        ...OWNER,
        subdomain: 'acme',
      });

      expect(result).toEqual({ tenant: { id: 'tenant-1' }, user: { id: 'user-1' } });
      expect(Tenant.create).toHaveBeenCalledWith(expect.anything(), { transaction: TX });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1', role: 'owner' }),
        { transaction: TX }
      );
    });

    test('un échec sur la création du propriétaire remonte sans laisser de tenant hors transaction', async () => {
      // La vraie transaction annule le tenant ; ici on vérifie que l'échec est
      // bien propagé depuis l'intérieur du bloc transactionnel.
      const failure = new Error('unique violation');
      User.create.mockRejectedValue(failure);

      await expect(
        tenantProvisioningService.createTenantWithOwner(OWNER)
      ).rejects.toThrow('unique violation');

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(Tenant.create).toHaveBeenCalledWith(expect.anything(), { transaction: TX });
    });

    test('un sous-domaine vide n’est pas persisté', async () => {
      await tenantProvisioningService.createTenantWithOwner({ ...OWNER, subdomain: '  ' });

      expect(Tenant.create.mock.calls[0][0]).not.toHaveProperty('subdomain');
    });

    test('le domaine ne fait plus partie de l’inscription', async () => {
      await tenantProvisioningService.createTenantWithOwner({
        ...OWNER,
        domain: 'https://acme.com',
      });

      expect(Tenant.create.mock.calls[0][0]).not.toHaveProperty('domain');
    });

    test('le conflit est levé avant toute écriture', async () => {
      User.findOne.mockResolvedValue({ emailVerifiedAt: null, pendingEmail: null });

      await catchError(tenantProvisioningService.createTenantWithOwner(OWNER));

      expect(sequelize.transaction).not.toHaveBeenCalled();
      expect(Tenant.create).not.toHaveBeenCalled();
    });
  });

  describe('registerSchema — normalisation en amont', () => {
    const payload = { ...OWNER, confirmPassword: OWNER.password };

    test('le sous-domaine est ramené en minuscules', () => {
      const { error, value } = registerSchema.validate({ ...payload, subdomain: 'ACME' });

      expect(error).toBeUndefined();
      expect(value.subdomain).toBe('acme');
    });

    test('un domaine transmis par un ancien client est ignoré', () => {
      const { error, value } = registerSchema.validate({ ...payload, domain: 'https://acme.com' }, {
        allowUnknown: false,
        stripUnknown: true,
      });

      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('domain');
    });
  });
});
