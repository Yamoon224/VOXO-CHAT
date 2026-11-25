jest.mock('../models', () => ({
  Conversation: { findOne: jest.fn(), findAll: jest.fn() },
}));

const { Conversation } = require('../models');
const service = require('./conversationExportService');

const conversation = {
  id: 'conversation-1', sessionId: 'session-12345678', title: 'Besoin d’aide',
  userName: 'Ada', userEmail: 'ada@example.test', channel: 'web', status: 'ended',
  createdAt: new Date('2026-08-14T10:00:00Z'), endedAt: null, satisfactionRating: 5,
  messages: [{ role: 'user', content: 'Bonjour', timestamp: '2026-08-14T10:00:00Z' }],
};

describe('conversationExportService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retrieves an individual conversation inside its tenant', async () => {
    Conversation.findOne.mockResolvedValue(conversation);
    await expect(service.getConversation('tenant-1', conversation.sessionId)).resolves.toBe(conversation);
    expect(Conversation.findOne).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', sessionId: conversation.sessionId } });
  });

  test('creates a detailed CSV for selected conversations', async () => {
    Conversation.findAll.mockResolvedValue([conversation]);
    const result = await service.buildBulkExport('tenant-1', [conversation.sessionId], 'csv');
    expect(result.extension).toBe('csv');
    expect(result.buffer.toString()).toContain('auteur_message');
    expect(result.buffer.toString()).toContain('Bonjour');
  });

  test('creates one PDF per selected conversation in a ZIP', async () => {
    Conversation.findAll.mockResolvedValue([conversation]);
    const result = await service.buildBulkExport('tenant-1', [conversation.sessionId], 'zip');
    expect(result.extension).toBe('zip');
    expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
