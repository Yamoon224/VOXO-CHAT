import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatAPI } from '../src/api.js';

test('preserves the HTTP status and backend error code', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({
      error: 'Conversation introuvable.',
      code: 'CONVERSATION_NOT_FOUND',
      details: { reason: 'missing' },
    }),
  });

  try {
    const api = new ChatAPI('https://api.test/api', 'tenant-test');
    await assert.rejects(
      api.getConversationHistory('session-test'),
      error => error.message === 'Conversation introuvable.'
        && error.status === 404
        && error.code === 'CONVERSATION_NOT_FOUND'
        && error.details.reason === 'missing'
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
