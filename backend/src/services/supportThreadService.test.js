jest.mock('../models', () => ({
  SupportTicket: { findByPk: jest.fn() },
  SupportMessage: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));

const { SupportTicket, SupportMessage, sequelize } = require('../models');
const service = require('./supportThreadService');

// Le service prend un verrou de ligne : la transaction simulée doit donc
// exposer `LOCK.UPDATE`, comme le fait la vraie.
const TX = { LOCK: { UPDATE: 'UPDATE' } };

const buildTicket = (overrides = {}) => ({
  id: 'ticket-1', status: 'open', update: jest.fn(), ...overrides,
});

describe('supportThreadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(fn => fn(TX));
    SupportTicket.findByPk.mockResolvedValue(buildTicket());
    SupportMessage.findOne.mockResolvedValue(null);
    SupportMessage.create.mockImplementation(async values => ({ id: 'msg-1', ...values }));
    SupportMessage.findAll.mockResolvedValue([]);
  });

  /**
   * LE point de sécurité du lot. Une note interne ne doit jamais quitter le
   * serveur vers le client — et le filtrage doit se faire DANS LA REQUÊTE, pas
   * à l'affichage : filtrer au rendu laisse la donnée voyager dans la réponse
   * HTTP, où n'importe qui peut la lire.
   */
  describe('étanchéité des notes internes', () => {
    test('the tenant view filters internal notes in the query itself', async () => {
      await service.listMessages('ticket-1', { includeInternal: false });

      expect(SupportMessage.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { ticketId: 'ticket-1', role: 'message' },
      }));
    });

    test('the tenant view filters them by default, without an explicit option', async () => {
      await service.listMessages('ticket-1');

      const [{ where }] = SupportMessage.findAll.mock.calls[0];
      expect(where.role).toBe('message');
    });

    test('the admin view includes them', async () => {
      await service.listMessages('ticket-1', { includeInternal: true });

      const [{ where }] = SupportMessage.findAll.mock.calls[0];
      expect(where).not.toHaveProperty('role');
    });

    // Un client ne doit pas pouvoir fabriquer une note interne en glissant le
    // drapeau dans sa requête.
    test('a tenant author can never write an internal note', async () => {
      await expect(service.addMessage({
        ticketId: 'ticket-1', authorType: 'tenant', authorName: 'Client',
        content: 'coucou', internal: true,
      })).rejects.toMatchObject({
        statusCode: 403, code: 'SUPPORT_INTERNAL_NOTE_FORBIDDEN',
      });

      expect(SupportMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('idempotence', () => {
    test('returns the existing message instead of writing a duplicate', async () => {
      SupportMessage.findOne.mockResolvedValue({
        id: 'msg-1', authorType: 'admin', authorName: 'Admin',
        role: 'message', content: 'déjà là', createdAt: new Date(),
      });

      const result = await service.addMessage({
        ticketId: 'ticket-1', authorType: 'admin', authorName: 'Admin',
        content: 'déjà là', clientMessageId: '11111111-1111-4111-8111-111111111111',
      });

      expect(result.duplicate).toBe(true);
      expect(SupportMessage.create).not.toHaveBeenCalled();
    });

    test('generates a key when the client did not supply one', async () => {
      await service.addMessage({
        ticketId: 'ticket-1', authorType: 'tenant', authorName: 'Client', content: 'bonjour',
      });

      const [values] = SupportMessage.create.mock.calls[0];
      expect(values.clientMessageId).toEqual(expect.any(String));
    });
  });

  /**
   * Le verrou porte sur la ligne du ticket : deux réponses simultanées ne
   * peuvent pas écrire un `lastMessageAt` incohérent. Le gabarit de la reprise
   * humaine ne verrouillait qu'à l'ajout de message, jamais à l'assignation.
   */
  test('takes a row lock inside the transaction', async () => {
    await service.addMessage({
      ticketId: 'ticket-1', authorType: 'admin', authorName: 'Admin', content: 'ok',
    });

    expect(SupportTicket.findByPk).toHaveBeenCalledWith('ticket-1', {
      transaction: TX,
      lock: TX.LOCK.UPDATE,
    });
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
  });

  describe('transitions de statut', () => {
    test('an admin reply moves an open ticket to pending', async () => {
      const ticket = buildTicket({ status: 'open' });
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.addMessage({
        ticketId: 'ticket-1', authorType: 'admin', authorName: 'Admin', content: 'réponse',
      });

      expect(ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }), { transaction: TX }
      );
    });

    test('a tenant reply reopens a resolved ticket', async () => {
      const ticket = buildTicket({ status: 'resolved' });
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.addMessage({
        ticketId: 'ticket-1', authorType: 'tenant', authorName: 'Client', content: 'toujours pas',
      });

      expect(ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', resolvedAt: null }), { transaction: TX }
      );
    });

    // Une note interne est invisible du client : elle ne doit ni rouvrir la
    // demande ni la faire remonter dans sa liste.
    test('an internal note does not touch the ticket at all', async () => {
      const ticket = buildTicket({ status: 'open' });
      SupportTicket.findByPk.mockResolvedValue(ticket);

      await service.addMessage({
        ticketId: 'ticket-1', authorType: 'admin', authorName: 'Admin',
        content: 'à surveiller', internal: true,
      });

      expect(ticket.update).not.toHaveBeenCalled();
      expect(SupportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'internal_note' }), expect.anything()
      );
    });
  });

  describe('garde-fous', () => {
    test('rejects an empty message', async () => {
      await expect(service.addMessage({
        ticketId: 'ticket-1', authorType: 'tenant', authorName: 'Client', content: '   ',
      })).rejects.toMatchObject({ statusCode: 400, code: 'SUPPORT_MESSAGE_REQUIRED' });
    });

    test('rejects an unknown ticket', async () => {
      SupportTicket.findByPk.mockResolvedValue(null);

      await expect(service.addMessage({
        ticketId: 'nope', authorType: 'tenant', authorName: 'Client', content: 'bonjour',
      })).rejects.toMatchObject({ statusCode: 404, code: 'SUPPORT_TICKET_NOT_FOUND' });
    });

    test('refuses to write into a closed ticket', async () => {
      SupportTicket.findByPk.mockResolvedValue(buildTicket({ status: 'closed' }));

      await expect(service.addMessage({
        ticketId: 'ticket-1', authorType: 'tenant', authorName: 'Client', content: 'encore',
      })).rejects.toMatchObject({ statusCode: 409, code: 'SUPPORT_TICKET_CLOSED' });
    });
  });
});
