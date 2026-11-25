// L'email d'un invité doit être contrôlé sur toute la plateforme, pas
// seulement dans le tenant invitant : `User.email` porte un index unique global.
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

const { Op } = require('sequelize');
const { TeamInvitation, User, Tenant, sequelize } = require('../models');
const emailService = require('./emailService');
const service = require('./teamInvitationService');

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'invitee@example.com';

describe('teamInvitationService — disponibilité de l’email', () => {
  const tenant = { id: TENANT_ID, name: 'Acme' };
  const actor = { id: 'owner-1', role: 'owner', firstName: 'Ada', lastName: 'Lovelace' };
  let transaction;

  const invite = (email = EMAIL) => service.createInvitation({
    tenant, actor, email, role: 'user',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = {
      LOCK: { UPDATE: 'UPDATE' },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    User.findOne.mockResolvedValue(null);
    TeamInvitation.findOne.mockResolvedValue(null);
    // L'entreprise est active : ce fichier teste l'unicité de l'email, pas l'état du tenant.
    Tenant.findOne.mockResolvedValue(tenant);
    TeamInvitation.create.mockImplementation(async (values) => ({
      id: 'invite-1', ...values, destroy: jest.fn(),
    }));
    emailService.sendTeamInvitation.mockResolvedValue(undefined);
  });

  describe('createInvitation', () => {
    test('une adresse déjà prise sur un autre tenant est refusée AVANT tout envoi', async () => {
      User.findOne.mockResolvedValue({ tenantId: OTHER_TENANT_ID, email: EMAIL });

      await expect(invite()).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_ALREADY_USED',
      });

      // Le cœur du correctif : ni invitation créée, ni email parti. Sinon
      // l'invité découvrait le conflit après avoir tout saisi.
      expect(TeamInvitation.create).not.toHaveBeenCalled();
      expect(emailService.sendTeamInvitation).not.toHaveBeenCalled();
    });

    test('un membre déjà présent dans l’équipe donne un message distinct', async () => {
      User.findOne.mockResolvedValue({ tenantId: TENANT_ID, email: EMAIL });

      await expect(invite()).rejects.toMatchObject({
        statusCode: 409,
        code: 'MEMBER_ALREADY_EXISTS',
      });
      expect(emailService.sendTeamInvitation).not.toHaveBeenCalled();
    });

    test('une adresse réservée par un changement d’email en attente est refusée', async () => {
      User.findOne.mockResolvedValue({ tenantId: OTHER_TENANT_ID, pendingEmail: EMAIL });

      await expect(invite()).rejects.toMatchObject({ code: 'EMAIL_ALREADY_USED' });
    });

    test('la recherche ne filtre pas par tenant et couvre pendingEmail', async () => {
      await invite();

      const [{ where }] = User.findOne.mock.calls[0];
      expect(where).not.toHaveProperty('tenantId');
      expect(where[Op.or]).toEqual([{ email: EMAIL }, { pendingEmail: EMAIL }]);
    });

    test('une adresse libre suit le parcours nominal', async () => {
      await invite(' Invitee@Example.com ');

      expect(TeamInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: EMAIL, tenantId: TENANT_ID })
      );
      expect(emailService.sendTeamInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ email: EMAIL })
      );
    });
  });

  describe('acceptInvitation', () => {
    test('une adresse prise entre-temps bloque avant la création du compte', async () => {
      TeamInvitation.findOne.mockResolvedValue({
        tenantId: TENANT_ID,
        email: EMAIL,
        role: 'user',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000),
        update: jest.fn(),
      });
      User.findOne.mockResolvedValue({ tenantId: OTHER_TENANT_ID, email: EMAIL });

      await expect(service.acceptInvitation({
        tenantId: TENANT_ID,
        token: 'a'.repeat(64),
        firstName: 'Grace',
        lastName: 'Hopper',
        password: 'Secret123!',
      })).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_USED' });

      expect(User.create).not.toHaveBeenCalled();
      expect(transaction.rollback).toHaveBeenCalled();
    });
  });
});
