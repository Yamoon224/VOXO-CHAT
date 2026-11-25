jest.mock('../models', () => ({
  AdminUser: { findAll: jest.fn() },
  AdminRole: {},
  User: { findOne: jest.fn() },
}));
jest.mock('./emailService', () => ({ sendBestEffort: jest.fn() }));
jest.mock('../utils/channelLogger', () => ({ logChannelEvent: jest.fn() }));

const { AdminUser, User } = require('../models');
const emailService = require('./emailService');
const { logChannelEvent } = require('../utils/channelLogger');
const notifier = require('./supportNotifier');

const admin = (id, permissions) => ({
  id, email: `${id}@voxo.test`, firstName: 'Ada',
  role: { isSystem: false, permissions },
});

const ticket = { id: 'ticket-1', subject: 'Panne', priority: 'high', openedByUserId: 'user-1' };
const tenant = { id: 'tenant-1', name: 'Acme' };

describe('supportNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emailService.sendBestEffort.mockResolvedValue(true);
    AdminUser.findAll.mockResolvedValue([admin('a1', { support: 'write' })]);
    User.findOne.mockResolvedValue({ id: 'user-1', email: 'client@acme.test', firstName: 'Cli' });
  });

  describe('nouvelle demande', () => {
    test('only notifies admins allowed to handle support', async () => {
      AdminUser.findAll.mockResolvedValue([
        admin('a1', { support: 'write' }),
        admin('a2', { support: 'read' }),
        admin('a3', { tenants: 'write' }),
      ]);

      await notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: 'Client' });

      expect(emailService.sendBestEffort).toHaveBeenCalledTimes(1);
      expect(emailService.sendBestEffort).toHaveBeenCalledWith(expect.objectContaining({
        to: 'a1@voxo.test', template: 'supportTicketOpened',
      }));
    });

    /**
     * Régression du défaut du gabarit : `every(Boolean)` sur une liste vide
     * vaut `true`, donc un ticket notifié à PERSONNE était enregistré comme
     * « envoyé ». Ici l'absence de destinataire est un échec explicite.
     */
    test('reports a failure when nobody can be notified', async () => {
      AdminUser.findAll.mockResolvedValue([]);

      await expect(notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: 'C' }))
        .resolves.toBe('failed');

      expect(logChannelEvent).toHaveBeenCalledWith(
        'error', 'support.ticket_opened.no_recipient', expect.objectContaining({ ticketId: 'ticket-1' })
      );
    });

    test('reports a partial delivery', async () => {
      AdminUser.findAll.mockResolvedValue([
        admin('a1', { support: 'write' }), admin('a2', { support: 'write' }),
      ]);
      emailService.sendBestEffort.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: 'C' }))
        .resolves.toBe('partial');
    });

    test('reports a total failure when every send fails', async () => {
      emailService.sendBestEffort.mockResolvedValue(false);

      await expect(notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: 'C' }))
        .resolves.toBe('failed');
    });

    // La notification ne doit jamais faire échouer l'enregistrement du ticket.
    test('never throws when the lookup itself fails', async () => {
      AdminUser.findAll.mockRejectedValue(new Error('DB down'));

      await expect(notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: 'C' }))
        .resolves.toBe('failed');
    });
  });

  describe('réponse au client', () => {
    test('emails the author of the ticket', async () => {
      await expect(notifier.notifyTenantOfReply({ ticket, adminName: 'Ada' }))
        .resolves.toBe('sent');

      expect(emailService.sendBestEffort).toHaveBeenCalledWith(expect.objectContaining({
        to: 'client@acme.test', template: 'supportTicketReplied',
      }));
    });

    test('reports a failure when the author is gone or blocked', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(notifier.notifyTenantOfReply({ ticket, adminName: 'Ada' }))
        .resolves.toBe('failed');
      expect(emailService.sendBestEffort).not.toHaveBeenCalled();
    });

    test('reports a failure when the ticket has no author left', async () => {
      await expect(notifier.notifyTenantOfReply({
        ticket: { ...ticket, openedByUserId: null }, adminName: 'Ada',
      })).resolves.toBe('failed');
    });
  });
});
