import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { getDefaultWidgetAssetUrl, getScriptConfig } from '../src/runtime-config.js';

test('resolves widget assets beside widget.js, including reverse-proxy prefixes', () => {
  assert.equal(
    getDefaultWidgetAssetUrl('chat-icon.svg', 'https://app.voxo.chat/backserv-backend/pre-prod/'),
    'https://app.voxo.chat/backserv-backend/pre-prod/public/widget-assets/chat-icon.svg'
  );
  assert.equal(getDefaultWidgetAssetUrl('chat icon.svg', 'https://api.test'), 'https://api.test/public/widget-assets/chat%20icon.svg');
  assert.equal(getDefaultWidgetAssetUrl('chat-icon.svg', null), null);
});

test('does not overwrite inferred defaults with missing data attributes', () => {
  const dom = new JSDOM('<script src="https://api.test/widget.js"></script>');
  globalThis.document = dom.window.document;

  const config = { apiUrl: 'https://api.test/api', ...getScriptConfig() };
  assert.deepEqual(config, { apiUrl: 'https://api.test/api' });

  delete globalThis.document;
  dom.window.close();
});

test('reads only non-empty script data attributes', () => {
  const dom = new JSDOM('<script src="https://api.test/widget.js" data-api-url="https://api.test/api" data-tenant-id="tenant"></script>');
  globalThis.document = dom.window.document;

  assert.deepEqual(getScriptConfig(), { tenantId: 'tenant', apiUrl: 'https://api.test/api' });

  delete globalThis.document;
  dom.window.close();
});
