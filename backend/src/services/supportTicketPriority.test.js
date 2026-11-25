const { priorityForReason } = require('./supportTicketService');

describe('priorityForReason', () => {
  test.each([
    ['account_access', 'high'], ['technical_issue', 'high'], ['documents', 'low'],
    ['billing', 'normal'], ['chatbot_setup', 'normal'], ['integrations', 'normal'], ['other', 'normal'],
  ])('assigns %s to %s priority', (reason, priority) => {
    expect(priorityForReason(reason)).toBe(priority);
  });
});
