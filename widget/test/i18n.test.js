import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCatalogParity, normalizeLocale, translate } from '../src/i18n.js';

test('widget catalogs have exact parity', () => {
  assert.equal(assertCatalogParity(), true);
});

test('unsupported widget locales fall back to French', () => {
  assert.equal(normalizeLocale('de-DE'), 'fr');
  assert.equal(translate('de', 'send'), 'Envoyer le message');
});

test('widget copy interpolates values', () => {
  assert.equal(translate('en', 'attachmentLimit', { count: 3 }), 'You can attach up to 3 files.');
  assert.equal(translate('fr', 'withAgent', { name: 'Ada' }), 'Vous échangez avec Ada');
});
