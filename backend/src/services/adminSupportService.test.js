jest.mock('../models', () => ({
  SupportTicket: { findAndCountAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), count: jest.fn() },
  Tenant: {}, User: {}, AdminUser: {},
  sequelize: { transaction: jest.fn() },
}));
jest.mock('./supportThreadService', () => ({
  listMessages: jest.fn().mockResolvedValue([]),
  addMessage: jest.fn(),
}));
jest.mock('./supportNotifier', () => ({ notifyTenantOfReply: jest.fn(), findRecipients: jest.fn() }));
jest.mock('./notificationService', () => ({ notify: jest.fn(), markTicketReadForOtherAdmins: jest.fn() }));
jest.mock('./supportEventService', () => ({ publish: jest.fn() }));

const { Op } = require('sequelize');
const { SupportTicket, sequelize } = require('../models');
const threadService = require('./supportThreadService');
const notifier = require('./supportNotifier');
const service = require('./adminSupportService');

const TX = { LOCK: { UPDATE: 'UPDATE' } };
const actor = { id: 'admin-1', firstName: 'Ada', lastName: 'Admin', email: 'ada@voxo.test' };

const buildTicket = (overrides = {}) => ({
  id: 'ticket-1', subject: 'Panne', status: 'open', priority: 'normal',
  assignedAdminId: null, update: jest.fn(), ...overrides,
});

describe('adminSupportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(fn => fn(TX));
    notifier.findRecipients.mockResolvedValue([actor]);
    threadService.addMessage.mockResolvedValue({ duplicate: false });
    SupportTicket.findOne.mockResolvedValue(buildTicket());
    SupportTicket.findByPk.mockResolvedValue(buildTicket());
    SupportTicket.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  describe('assignation', () => {
    /**
     * Le gabarit de la reprise humaine lisait puis écrivait SANS verrou : deux
     * administrateurs cliquant en même temps s'attribuaient le même ticket et
     * le second écrasait le premier. Ici le verrou est pris dans la transaction.
     */
    test('takes a row lock before claiming', async () => {
      await service.assignTicket({ ticketId: 'ticket-1', actor });

      expect(SupportTicket.findByPk).toHaveBeenCalledWith('ticket-1', {
        transaction: TX, lock: TX.LOCK.UPDATE,
      });
    });

    test('assigns the ticket to the acting admin by default', async () => {
      const ticket = buildTicket();
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.assignTicket({ ticketId: 'ticket-1', actor });

      expect(ticket.update).toHaveBeenCalledWith(
        { assignedAdminId: 'admin-1' }, { transaction: TX }
      );
    });

    test('transfers a ticket held by another admin under the row lock', async () => {
      const ticket = buildTicket({ assignedAdminId: 'admin-2' });
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.assignTicket({ ticketId: 'ticket-1', actor });

      expect(ticket.update).toHaveBeenCalledWith(
        { assignedAdminId: 'admin-1' }, { transaction: TX }
      );
    });

    test('re-claiming your own ticket is a no-op, not an error', async () => {
      const ticket = buildTicket({ assignedAdminId: 'admin-1' });
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.assignTicket({ ticketId: 'ticket-1', actor });

      expect(ticket.update).not.toHaveBeenCalled();
    });

    test('only the assignee may release the ticket', async () => {
      SupportTicket.findOne.mockResolvedValue(buildTicket({ assignedAdminId: 'admin-2' }));

      await expect(service.releaseTicket({ ticketId: 'ticket-1', actor }))
        .rejects.toMatchObject({ statusCode: 403, code: 'SUPPORT_TICKET_NOT_ASSIGNED' });
    });
  });

  describe('liste', () => {
    test('groups open and pending under the "open" filter', async () => {
      await service.listTickets({ status: 'open' });

      const [{ where }] = SupportTicket.findAndCountAll.mock.calls[0];
      expect(where.status).toEqual({ [Op.in]: ['open', 'pending'] });
    });

    test('drops the status filter when "all" is requested', async () => {
      await service.listTickets({ status: 'all' });

      const [{ where }] = SupportTicket.findAndCountAll.mock.calls[0];
      expect(where).not.toHaveProperty('status');
    });

    test('clamps pagination', async () => {
      await service.listTickets({ page: 3, limit: 500 });

      expect(SupportTicket.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100, offset: 200,
      }));
    });

    test('filters on the acting admin when asked', async () => {
      await service.listTickets({ assignedToMe: true, actorId: 'admin-1' });

      const [{ where }] = SupportTicket.findAndCountAll.mock.calls[0];
      expect(where.assignedAdminId).toBe('admin-1');
    });

    test('filters tickets by their structured reason', async () => {
      await service.listTickets({ reason: 'technical_issue' });

      const [{ where }] = SupportTicket.findAndCountAll.mock.calls[0];
      expect(where.reason).toBe('technical_issue');
    });

    // Le badge doit se servir d'un compteur dédié, pas d'une dépagination.
    test('counts open tickets without loading them', async () => {
      SupportTicket.count.mockResolvedValue(4);

      await expect(service.countOpenTickets()).resolves.toBe(4);
      expect(SupportTicket.findAndCountAll).not.toHaveBeenCalled();
    });
  });

  describe('réponse', () => {
    test('notifies the tenant on a public reply', async () => {
      await service.reply({ ticketId: 'ticket-1', actor, content: 'voici la solution' });

      expect(threadService.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        authorType: 'admin', internal: false,
      }));
      expect(notifier.notifyTenantOfReply).toHaveBeenCalled();
    });

    // Une note interne ne concerne pas le client : aucun email ne doit partir.
    test('never notifies the tenant for an internal note', async () => {
      await service.reply({
        ticketId: 'ticket-1', actor, content: 'à surveiller', internal: true,
      });

      expect(notifier.notifyTenantOfReply).not.toHaveBeenCalled();
    });

    test('admin view of the thread includes internal notes', async () => {
      await service.getTicketDetail('ticket-1');

      expect(threadService.listMessages).toHaveBeenCalledWith(
        'ticket-1', { includeInternal: true }
      );
    });
  });

  describe('statut', () => {
    test('stamps resolvedAt when resolving', async () => {
      const ticket = buildTicket({ status: 'open' });
      SupportTicket.findOne.mockResolvedValue(ticket);

      await service.updateStatus({ ticketId: 'ticket-1', status: 'resolved' });

      expect(ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'resolved', resolvedAt: expect.any(Date),
      }));
    });

    test('rejects a no-op instead of pretending it worked', async () => {
      SupportTicket.findOne.mockResolvedValue(buildTicket({ status: 'open' }));

      await expect(service.updateStatus({ ticketId: 'ticket-1', status: 'open' }))
        .rejects.toMatchObject({ statusCode: 409, code: 'SUPPORT_STATUS_UNCHANGED' });
    });
  });
});
