import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WIDGET_FEATURES,
  mergeChatbotOptions,
  normalizeChatbotOptions
} from './chatbot-options.mjs';

test('les pièces jointes restent désactivées par défaut', () => {
  assert.equal(normalizeChatbotOptions().features.attachments, false);
});

test('normalise les options sans perdre les drapeaux existants', () => {
  const options = normalizeChatbotOptions({
    enableMarkdown: false,
    features: { attachments: true, messageFeedback: false }
  });

  assert.equal(options.enableMarkdown, false);
  assert.equal(options.features.attachments, true);
  assert.equal(options.features.messageFeedback, false);
  assert.equal(options.features.showTimestamps, true);
});

test('fusionne un import partiel sans réactiver les options désactivées', () => {
  const merged = mergeChatbotOptions(
    { features: { ...DEFAULT_WIDGET_FEATURES, messageFeedback: false } },
    { features: { attachments: true } }
  );

  assert.equal(merged.features.messageFeedback, false);
  assert.equal(merged.features.attachments, true);
});
