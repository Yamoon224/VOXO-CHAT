jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn(callback => callback('transaction')) },
  Conversation: { findOne: jest.fn() },
  ConversationLabel: { findAll: jest.fn() },
  ConversationLabelAssignment: { destroy: jest.fn(), bulkCreate: jest.fn() },
}));
jest.mock('./conversationEventService', () => ({ publish: jest.fn() }));

const models = require('../models');
const events = require('./conversationEventService');
const service = require('./conversationLabelService');

describe('conversationLabelService.assign', () => {
  beforeEach(() => jest.clearAllMocks());

  test('remplace les associations dans une transaction et publie les étiquettes', async () => {
    models.Conversation.findOne.mockResolvedValue({ id: 'conversation-a' });
    models.ConversationLabel.findAll.mockResolvedValue([{ id: 'label-a', name: 'VIP', color: 'purple' }]);
    const labels = await service.assign('tenant-a', 'session-a', ['label-a']);
    expect(labels).toEqual([expect.objectContaining({ id: 'label-a', name: 'VIP', color: 'purple' })]);
    expect(models.ConversationLabelAssignment.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-a', conversationId: 'conversation-a' } }));
    expect(models.ConversationLabelAssignment.bulkCreate).toHaveBeenCalledWith([expect.objectContaining({ tenantId: 'tenant-a', conversationId: 'conversation-a', labelId: 'label-a' })], expect.anything());
    expect(events.publish).toHaveBeenCalledWith('tenant-a', 'session-a', expect.objectContaining({ labels }));
  });

  test('refuse une étiquette provenant d’un autre tenant', async () => {
    models.Conversation.findOne.mockResolvedValue({ id: 'conversation-a' });
    models.ConversationLabel.findAll.mockResolvedValue([]);
    await expect(service.assign('tenant-a', 'session-a', ['foreign-label'])).rejects.toMatchObject({ code: 'INVALID_LABEL' });
  });
});
