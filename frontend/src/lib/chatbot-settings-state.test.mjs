import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDefaultChatbotSettings,
  mergeImportedSettings,
  normalizeChatbotSettings,
  validateChatbotSettings
} from './chatbot-settings-state.mjs'

test('normalise un profil partiel et conserve les booléens désactivés', () => {
  const settings = normalizeChatbotSettings({
    features: { analytics: false },
    options: { features: { attachments: true, messageFeedback: false } }
  })

  assert.equal(settings.features.analytics, false)
  assert.equal(settings.options.features.attachments, true)
  assert.equal(settings.options.features.messageFeedback, false)
})

test('fusionne un import partiel sans perdre les options du widget', () => {
  const current = createDefaultChatbotSettings()
  current.options.features.messageFeedback = false
  const merged = mergeImportedSettings(current, {
    name: 'Assistant documents',
    options: { features: { attachments: true } }
  })

  assert.equal(merged.name, 'Assistant documents')
  assert.equal(merged.options.features.attachments, true)
  assert.equal(merged.options.features.messageFeedback, false)
})

test('rejette une configuration importée invalide', () => {
  const invalid = createDefaultChatbotSettings()
  invalid.theme.primaryColor = 'bleu'
  assert.equal(validateChatbotSettings(invalid).isValid, false)
})
