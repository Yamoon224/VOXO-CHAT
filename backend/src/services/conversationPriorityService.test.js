jest.mock('../models', () => ({ Conversation: { findOne: jest.fn() } }));
jest.mock('./conversationPriorityAiService', () => ({ classify: jest.fn() }));
jest.mock('./conversationEventService', () => ({ publish: jest.fn() }));

const { Conversation } = require('../models');
const ai = require('./conversationPriorityAiService');
const events = require('./conversationEventService');
const service = require('./conversationPriorityService');

function conversation(values = {}) {
  const item = { priority: 'normal', prioritySource: 'default', messages: [], ...values };
  item.update = jest.fn(async changes => Object.assign(item, changes));
  return item;
}

describe('conversationPriorityService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ne remplace jamais une priorité verrouillée manuellement', async () => {
    const item = conversation({ priority: 'critical', prioritySource: 'manual' });
    Conversation.findOne.mockResolvedValue(item);
    await service.classifyConversation('tenant-a', 'session-a');
    expect(ai.classify).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
  });

  test('enregistre la classification IA et publie la mise à jour', async () => {
    const item = conversation({ messages: [{ role: 'user', content: 'Service bloqué' }] });
    Conversation.findOne.mockResolvedValue(item);
    ai.classify.mockResolvedValue({ value: 'urgent', reason: 'Service bloqué' });
    const result = await service.classifyConversation('tenant-a', 'session-a');
    expect(result.value).toBe('urgent');
    expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ priority: 'urgent', prioritySource: 'ai' }));
    expect(events.publish).toHaveBeenCalledWith('tenant-a', 'session-a', expect.objectContaining({ type: 'conversation.updated' }));
  });

  test('une valeur manuelle verrouille la priorité', async () => {
    const item = conversation();
    Conversation.findOne.mockResolvedValue(item);
    const result = await service.updateManual('tenant-a', 'session-a', 'important');
    expect(result).toEqual(expect.objectContaining({ value: 'important', source: 'manual' }));
  });
});
