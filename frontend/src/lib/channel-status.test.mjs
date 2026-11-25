import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mergeTelegramStatus,
  mergeWhatsAppStatus,
} from './channel-status.mjs'

test('mergeTelegramStatus preserves the local token when refreshing sanitized status', () => {
  const result = mergeTelegramStatus(
    { botToken: 'local-token', webhookActive: false },
    {
      botTokenConfigured: true,
      botUsername: 'voxo_bot',
      webhookActive: true,
    }
  )

  assert.equal(result.botToken, 'local-token')
  assert.equal(result.botTokenConfigured, true)
  assert.equal(result.botUsername, 'voxo_bot')
  assert.equal(result.webhookActive, true)
})

test('mergeTelegramStatus records error state without losing configured token', () => {
  const result = mergeTelegramStatus(
    { botToken: 'local-token', webhookActive: true },
    {
      webhookActive: false,
      lastError: 'Bad token',
    }
  )

  assert.equal(result.botToken, 'local-token')
  assert.equal(result.webhookActive, false)
  assert.equal(result.lastError, 'Bad token')
})

test('mergeWhatsAppStatus refreshes Meta phone data from the API payload', () => {
  const result = mergeWhatsAppStatus(
    { phoneNumberId: 'old-number' },
    {
      provider: 'meta',
      phoneNumberId: 'phone-1',
      displayPhoneNumber: '+225 01 02 03 04 05',
      webhookActive: true,
    }
  )

  assert.equal(result.provider, 'meta')
  assert.equal(result.phoneNumberId, 'phone-1')
  assert.equal(result.displayPhoneNumber, '+225 01 02 03 04 05')
  assert.equal(result.webhookActive, true)
})
