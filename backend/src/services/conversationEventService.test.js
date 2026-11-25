jest.mock('./conversationPriorityService', () => ({ schedule: jest.fn() }));

const priority = require('./conversationPriorityService');
const events = require('./conversationEventService');

test('programme une classification uniquement après un message client', () => {
  events.publish('tenant-a', 'session-a', { type: 'message', message: { role: 'assistant' } });
  expect(priority.schedule).not.toHaveBeenCalled();
  events.publish('tenant-a', 'session-a', { type: 'message', message: { role: 'user' } });
  expect(priority.schedule).toHaveBeenCalledWith('tenant-a', 'session-a');
});
