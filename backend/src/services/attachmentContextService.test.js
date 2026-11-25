jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(async callback => callback({ id: 'reserve-tx' })) },
  MessageAttachment: { findAll: jest.fn(), update: jest.fn(async () => [1]) },
}));

const { MessageAttachment } = require('../models');
const service = require('./attachmentContextService');
const { MAX_EXTRACTED_CHARS, MAX_ATTACHMENTS_PER_MESSAGE } = require('../config/fileUploads');

const attachment = (overrides = {}) => ({
  id: 'att-1',
  originalName: 'contrat.pdf',
  category: 'document',
  extractedText: 'Le contrat prend effet au 1er janvier.',
  ...overrides,
});

describe('reserveForMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ne renvoie rien sans identifiant', async () => {
    await expect(service.reserveForMessage('tenant-1', [], 'message-1')).resolves.toEqual([]);
    expect(MessageAttachment.findAll).not.toHaveBeenCalled();
  });

  test('réserve puis relit uniquement les pièces du tenant et du message', async () => {
    MessageAttachment.findAll.mockResolvedValue([attachment()]);

    await service.reserveForMessage('tenant-1', ['att-1'], 'message-1');

    expect(MessageAttachment.update).toHaveBeenCalledWith(
      { messageId: 'message-1' },
      {
        where: { id: ['att-1'], tenantId: 'tenant-1', conversationId: null, messageId: null },
        transaction: { id: 'reserve-tx' },
      }
    );
    const where = MessageAttachment.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: ['att-1'], tenantId: 'tenant-1', conversationId: null });
    expect(Object.getOwnPropertySymbols(where)).toHaveLength(1);
  });

  test('échoue si une pièce est introuvable ou déjà consommée', async () => {
    MessageAttachment.findAll.mockResolvedValue([]);

    await expect(service.reserveForMessage('tenant-1', ['att-1'], 'message-1'))
      .rejects.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND', statusCode: 404 });
  });

  test('refuse plus de pièces que la limite par message', async () => {
    const ids = Array.from({ length: MAX_ATTACHMENTS_PER_MESSAGE + 1 }, (_, i) => `att-${i}`);

    await expect(service.reserveForMessage('tenant-1', ids, 'message-1'))
      .rejects.toMatchObject({ code: 'TOO_MANY_ATTACHMENTS' });
    expect(MessageAttachment.findAll).not.toHaveBeenCalled();
  });

  test('une réservation concurrente ne peut être gagnée que par un message', async () => {
    const row = attachment({ messageId: null, conversationId: null });
    MessageAttachment.update.mockImplementation(async (values) => {
      if (row.messageId === null) {
        row.messageId = values.messageId;
        return [1];
      }
      return [0];
    });
    MessageAttachment.findAll.mockImplementation(async ({ where }) => {
      const operator = Object.getOwnPropertySymbols(where)[0];
      const allowed = where[operator].some(item => item.messageId === row.messageId);
      return allowed ? [row] : [];
    });

    const results = await Promise.allSettled([
      service.reserveForMessage('tenant-1', ['att-1'], 'message-a'),
      service.reserveForMessage('tenant-1', ['att-1'], 'message-b'),
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });
});

describe('buildTextContext', () => {
  test('renvoie une chaîne vide sans texte extrait', () => {
    expect(service.buildTextContext([attachment({ extractedText: null })], 'test')).toBe('');
  });

  test('nomme le fichier dans le contexte', () => {
    const context = service.buildTextContext([attachment()], 'quand commence le contrat ?');

    expect(context).toContain('contrat.pdf');
    expect(context).toContain('1er janvier');
  });

  test('borne le contexte total, quel que soit le nombre de pièces', () => {
    const huge = 'phrase de remplissage. '.repeat(5000);
    const items = [
      attachment({ id: 'a', originalName: 'a.pdf', extractedText: huge }),
      attachment({ id: 'b', originalName: 'b.pdf', extractedText: huge }),
    ];

    expect(service.buildTextContext(items, 'remplissage').length).toBeLessThanOrEqual(MAX_EXTRACTED_CHARS);
  });
});

describe('selectRelevantText', () => {
  test('renvoie le texte tel quel sous le budget', () => {
    expect(service.selectRelevantText('court', 'question', 100)).toBe('court');
  });

  test('privilégie le passage qui répond à la question', () => {
    const filler = 'contenu neutre sans rapport. '.repeat(200);
    const needle = 'Le remboursement intervient sous quarante-huit heures. ';
    const text = `${filler}${needle}${filler}`;

    const selected = service.selectRelevantText(text, 'remboursement', 3500);

    expect(selected).toContain('remboursement');
    expect(selected.length).toBeLessThanOrEqual(3500);
  });
});

describe('attachToMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MessageAttachment.update.mockResolvedValue([1]);
  });

  test('ne fait rien sans pièce jointe', async () => {
    await service.attachToMessage([], 'conv-1', 'msg-1');
    expect(MessageAttachment.update).not.toHaveBeenCalled();
  });

  test('rattache les pièces au message créé', async () => {
    const transaction = { id: 'tx-1' };
    await service.attachToMessage([attachment()], 'tenant-1', 'conv-1', 'msg-1', transaction);

    expect(MessageAttachment.update).toHaveBeenCalledWith(
      { conversationId: 'conv-1' },
      {
        where: {
          id: ['att-1'], tenantId: 'tenant-1', messageId: 'msg-1', conversationId: null,
        },
        transaction,
      }
    );
  });
});
