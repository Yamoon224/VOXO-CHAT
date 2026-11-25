const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAppId, matchesAllowedApps, validateAppIdList, MAX_APP_IDS } = require('./allowed-apps');

test('accepts bundle identifiers and package names, rejects anything else', () => {
  assert.equal(normalizeAppId(' com.exemple.app '), 'com.exemple.app');
  assert.equal(normalizeAppId('fr.exemple-app_2'), 'fr.exemple-app_2');
  for (const value of ['', '.hidden', 'a b', 'https://x.y', 'app/id', '<script>', null, 42, 'a'.repeat(256)]) {
    assert.equal(normalizeAppId(value), null, String(value));
  }
});

test('matches case-insensitively, since iOS ignores the case of a bundle identifier', () => {
  assert.equal(matchesAllowedApps('COM.Exemple.App', ['com.exemple.app']), true);
  assert.equal(matchesAllowedApps('com.autre.app', ['com.exemple.app']), false);
  assert.equal(matchesAllowedApps(undefined, ['com.exemple.app']), false);
  assert.equal(matchesAllowedApps('com.exemple.app', []), false);
});

test('validates a list: dedupes ignoring case, reports the first invalid entry', () => {
  assert.deepEqual(validateAppIdList(['com.a.b', 'COM.A.B', 'fr.c.d']), { value: ['com.a.b', 'fr.c.d'], error: null });
  assert.match(validateAppIdList(['com.a.b', 'pas valide']).error, /pas valide/);
  assert.ok(validateAppIdList('nope').error);
});

test('caps the list at 50 entries', () => {
  const many = Array.from({ length: MAX_APP_IDS + 1 }, (_, index) => `com.app${index}`);
  assert.ok(validateAppIdList(many).error);
  assert.equal(validateAppIdList(many.slice(0, MAX_APP_IDS)).error, null);
});
