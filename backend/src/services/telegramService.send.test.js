jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../utils/channelLogger', () => ({
  logChannelEvent: jest.fn(),
}));

const axios = require('axios');
const telegramService = require('./telegramService');
const { logChannelEvent } = require('../utils/channelLogger');

const SEND_URL = 'https://api.telegram.org/bottoken-1/sendMessage';
const TIMEOUT = { timeout: 10000 };

function providerError(status, data = {}) {
  const error = new Error('Provider unavailable');
  if (status) {
    error.response = { status, data: { error_code: status, ...data } };
  }
  return error;
}

function markdownError() {
  return Object.assign(new Error('Request failed with status code 400'), {
    response: {
      status: 400,
      data: { ok: false, description: "Bad Request: can't parse entities: unmatched '*'" },
    },
  });
}

describe('telegramService sendMessage — adaptation au canal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends source-based suggestions as a reply keyboard', async () => {
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    await telegramService.sendMessage('token-1', '123', 'Réponse', {
      assistantMessageId: 'assistant-1',
      suggestions: ['Comment souscrire ?', 'Puis-je changer de formule ?'],
    });

    expect(axios.post).toHaveBeenCalledWith(
      SEND_URL,
      expect.objectContaining({
        chat_id: '123',
        reply_markup: {
          keyboard: [
            [{ text: 'Comment souscrire ?' }],
            [{ text: 'Puis-je changer de formule ?' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
      TIMEOUT
    );
  });

  it('removes a previous reply keyboard when no suggestion is available', async () => {
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    await telegramService.sendMessage('token-1', '123', 'Réponse sans suggestion', { removeKeyboard: true });

    expect(axios.post).toHaveBeenCalledWith(
      SEND_URL,
      expect.objectContaining({ reply_markup: { remove_keyboard: true } }),
      TIMEOUT
    );
  });

  it('réessaie sans parse_mode quand Telegram rejette le Markdown', async () => {
    axios.post.mockRejectedValueOnce(markdownError());
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    const result = await telegramService.sendMessage('token-1', '123', 'Tarif * spécial');

    expect(result).toEqual({ ok: true });
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post.mock.calls[0][1]).toHaveProperty('parse_mode', 'Markdown');
    expect(axios.post.mock.calls[1][1]).not.toHaveProperty('parse_mode');
    expect(axios.post.mock.calls[1][1]).toMatchObject({ chat_id: '123', text: 'Tarif * spécial' });
  });

  it('conserve le clavier de suggestions lors du repli en texte brut', async () => {
    axios.post.mockRejectedValueOnce(markdownError());
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    await telegramService.sendMessage('token-1', '123', 'Réponse *cassée', {
      suggestions: ['Voir les tarifs'],
      assistantMessageId: 'assistant-1',
    });

    expect(axios.post.mock.calls[1][1].reply_markup).toMatchObject({
      keyboard: [[{ text: 'Voir les tarifs' }]],
    });
  });

  it('ne masque pas une erreur Telegram qui n’est pas un problème de Markdown', async () => {
    axios.post.mockRejectedValueOnce(providerError(403, {
      description: 'Forbidden: bot was blocked by the user',
    }));

    await expect(telegramService.sendMessage('token-1', '123', 'Bonjour')).rejects.toThrow();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});

describe('telegramService sendMessage — fiabilité de livraison', () => {
  const context = {
    tenantId: 'tenant-1',
    messageId: 'message-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends text once and logs the provider message id', async () => {
    axios.post.mockResolvedValue({
      data: { ok: true, result: { message_id: 42 } },
    });

    await expect(
      telegramService.sendMessage('token-1', 'chat-1', 'Texte prive', context)
    ).resolves.toMatchObject({ ok: true });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sendMessage'),
      { chat_id: 'chat-1', text: 'Texte prive', parse_mode: 'Markdown' },
      TIMEOUT
    );
    expect(logChannelEvent).toHaveBeenCalledWith(
      'info',
      'message.send_succeeded',
      expect.objectContaining({ providerMessageId: 42, attempt: 1 })
    );

    const serializedLogs = JSON.stringify(logChannelEvent.mock.calls);
    expect(serializedLogs).not.toContain('token-1');
    expect(serializedLogs).not.toContain('Texte prive');
  });

  test.each([
    ['network error', Object.assign(new Error('Network error'), { code: 'ECONNRESET' }), 500],
    ['timeout', Object.assign(new Error('Timeout'), { code: 'ECONNABORTED' }), 500],
    ['rate limit', providerError(429, { parameters: { retry_after: 20 } }), 5000],
    ['server error', providerError(503), 500],
  ])('retries a %s then succeeds', async (label, error, expectedDelayMs) => {
    axios.post
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ data: { ok: true, result: { message_id: 43 } } });

    const delivery = telegramService.sendMessage('token-1', 'chat-1', 'Reponse', context);
    await jest.advanceTimersByTimeAsync(expectedDelayMs);
    await expect(delivery).resolves.toMatchObject({ ok: true });

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(logChannelEvent).toHaveBeenCalledWith(
      'warn',
      'message.send_retry',
      expect.objectContaining({ delayMs: expectedDelayMs, nextAttempt: 2 })
    );
  });

  it('uses exponential backoff and fails after three attempts', async () => {
    const error = providerError(500);
    axios.post.mockRejectedValue(error);

    const delivery = telegramService.sendMessage('token-1', 'chat-1', 'Reponse', context);
    const rejection = expect(delivery).rejects.toBe(error);
    await jest.runAllTimersAsync();
    await rejection;

    expect(axios.post).toHaveBeenCalledTimes(3);
    const retryLogs = logChannelEvent.mock.calls
      .filter(([, eventType]) => eventType === 'message.send_retry');
    expect(retryLogs.map(([, , payload]) => payload.delayMs)).toEqual([500, 1000]);
    expect(logChannelEvent).toHaveBeenCalledWith(
      'error',
      'message.send_failed',
      expect.objectContaining({ attempt: 3, httpStatus: 500 })
    );
    expect(JSON.stringify(logChannelEvent.mock.calls)).not.toContain('token-1');
    expect(JSON.stringify(logChannelEvent.mock.calls)).not.toContain('Reponse');
  });

  test.each([400, 401, 403])('does not retry HTTP %s', async (status) => {
    const error = providerError(status);
    axios.post.mockRejectedValue(error);

    await expect(
      telegramService.sendMessage('token-1', 'chat-1', 'Reponse', context)
    ).rejects.toBe(error);

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(logChannelEvent).not.toHaveBeenCalledWith(
      'warn',
      'message.send_retry',
      expect.anything()
    );
  });

  // L'ordre compte : si la boucle de retry était imbriquée dans le repli Markdown,
  // le 400 de formatage consommerait une tentative et le message serait perdu.
  it('ne consomme pas de tentative pour le repli Markdown avant de réessayer un 429', async () => {
    axios.post
      .mockRejectedValueOnce(markdownError())
      .mockRejectedValueOnce(providerError(429, { parameters: { retry_after: 1 } }))
      .mockResolvedValueOnce({ data: { ok: true, result: { message_id: 44 } } });

    const delivery = telegramService.sendMessage('token-1', 'chat-1', 'Tarif * spécial', context);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(delivery).resolves.toMatchObject({ ok: true });

    expect(axios.post).toHaveBeenCalledTimes(3);
    const attemptLogs = logChannelEvent.mock.calls
      .filter(([, eventType]) => eventType === 'message.send_attempt');
    expect(attemptLogs.map(([, , payload]) => payload.attempt)).toEqual([1, 2]);
    expect(logChannelEvent).toHaveBeenCalledWith(
      'warn',
      'message.markdown_fallback',
      expect.objectContaining({ attempt: 1 })
    );
  });
});
