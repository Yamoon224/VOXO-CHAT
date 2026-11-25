const { MESSAGE_TYPES, createInboundMessage } = require('./channelMessage');

function validInput(overrides = {}) {
  return {
    channel: 'telegram',
    provider: 'telegram',
    externalMessageId: 'message-1',
    externalConversationId: 'conversation-1',
    sender: {
      externalUserId: 'user-1',
      displayName: 'Alice',
      username: 'alice',
    },
    type: MESSAGE_TYPES.TEXT,
    text: 'Bonjour',
    occurredAt: '2026-06-30T12:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('channelMessage', () => {
  it('creates a versioned canonical inbound message', () => {
    expect(createInboundMessage(validInput())).toEqual({
      status: 'accepted',
      message: {
        version: 1,
        channel: 'telegram',
        provider: 'telegram',
        direction: 'inbound',
        externalMessageId: 'message-1',
        externalConversationId: 'conversation-1',
        sender: {
          externalUserId: 'user-1',
          displayName: 'Alice',
          username: 'alice',
        },
        type: 'text',
        text: 'Bonjour',
        media: null,
        occurredAt: '2026-06-30T12:00:00.000Z',
        metadata: {},
      },
    });
  });

  it('normalizes optional media values', () => {
    const result = createInboundMessage(validInput({
      type: MESSAGE_TYPES.DOCUMENT,
      text: null,
      media: { reference: 'file-1', sizeBytes: '12' },
    }));

    expect(result).toMatchObject({
      status: 'accepted',
      message: {
        type: 'document',
        text: null,
        media: {
          reference: 'file-1',
          mimeType: null,
          fileName: null,
          sizeBytes: 12,
          durationSeconds: null,
        },
      },
    });
  });

  it('rejects missing required fields', () => {
    expect(createInboundMessage(validInput({ externalMessageId: null }))).toMatchObject({
      status: 'ignored',
      reason: 'invalid_message',
      context: { missingFields: ['externalMessageId'] },
    });
  });

  it('rejects unsupported types, empty text and invalid timestamps', () => {
    expect(createInboundMessage(validInput({ type: 'video' }))).toMatchObject({
      status: 'ignored',
      reason: 'unsupported_type',
    });
    expect(createInboundMessage(validInput({ text: ' ' }))).toMatchObject({
      status: 'ignored',
      reason: 'empty_text',
    });
    expect(createInboundMessage(validInput({ occurredAt: 'invalid' }))).toMatchObject({
      status: 'ignored',
      reason: 'invalid_timestamp',
    });
  });
});
