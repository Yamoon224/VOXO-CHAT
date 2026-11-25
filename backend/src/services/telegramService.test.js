jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../utils/channelLogger', () => ({
  logChannelEvent: jest.fn(),
}));

const telegramService = require('./telegramService');

function update(message = {}) {
  return {
    message: {
      message_id: 42,
      date: 1782811200,
      chat: { id: 123, type: 'private' },
      from: {
        id: 123,
        username: 'alice',
        first_name: 'Alice',
        last_name: 'Doe',
      },
      ...message,
    },
  };
}

describe('telegramService mapInboundMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps a text message to the canonical contract', () => {
    const result = telegramService.mapInboundMessage(update({ text: 'Bonjour' }));

    expect(result).toMatchObject({
      status: 'accepted',
      message: {
        version: 1,
        channel: 'telegram',
        provider: 'telegram',
        externalMessageId: '42',
        externalConversationId: '123',
        sender: {
          externalUserId: '123',
          displayName: 'Alice Doe',
          username: 'alice',
        },
        type: 'text',
        text: 'Bonjour',
        media: null,
      },
    });
  });

  it('maps a suggestion callback to an opaque server-resolved selection', () => {
    const result = telegramService.mapInboundMessage({
      callback_query: {
        id: 'callback-1',
        data: 'sg:assistant-1:0',
        from: { id: 123, username: 'alice', first_name: 'Alice', last_name: 'Doe' },
        message: { date: 1782811200, chat: { id: 123, type: 'private' } },
      },
    });

    expect(result).toMatchObject({
      status: 'accepted',
      message: {
        externalMessageId: 'callback-callback-1',
        text: '__telegram_suggestion__',
        metadata: { telegramSuggestion: { assistantMessageId: 'assistant-1', index: 0 } },
      },
    });
  });

  it('ignores malformed suggestion callbacks', () => {
    expect(telegramService.mapInboundMessage({
      callback_query: { id: 'callback-1', data: 'bad', message: { chat: { id: 123, type: 'private' } } },
    })).toMatchObject({ status: 'ignored', reason: 'unsupported_callback' });
  });

  test.each([
    [
      { photo: [{ file_id: 'small' }, { file_id: 'large', file_size: 120 }], caption: 'Photo' },
      'image',
      'large',
    ],
    [
      {
        document: {
          file_id: 'doc-1',
          file_name: 'doc.pdf',
          mime_type: 'application/pdf',
        },
      },
      'document',
      'doc-1',
    ],
    [
      { voice: { file_id: 'voice-1', mime_type: 'audio/ogg', duration: 6 } },
      'voice',
      'voice-1',
    ],
  ])('maps supported media', (message, type, reference) => {
    const result = telegramService.mapInboundMessage(update(message));

    expect(result).toMatchObject({
      status: 'accepted',
      message: {
        type,
        media: { reference },
      },
    });
  });

  it('ignores unsupported updates and generic audio', () => {
    expect(telegramService.mapInboundMessage({})).toMatchObject({
      status: 'ignored',
      reason: 'unsupported_event',
    });
    expect(telegramService.mapInboundMessage(update({ audio: { file_id: 'audio-1' } })))
      .toMatchObject({ status: 'ignored', reason: 'unsupported_type' });
  });

  it('ignores bot-authored and group messages', () => {
    expect(telegramService.mapInboundMessage(update({
      text: 'Bot message',
      from: { id: 99, is_bot: true },
    }))).toMatchObject({ status: 'ignored', reason: 'from_me' });
    expect(telegramService.mapInboundMessage(update({
      text: 'Group message',
      chat: { id: -10, type: 'group' },
    }))).toMatchObject({ status: 'ignored', reason: 'group_message' });
  });
});
