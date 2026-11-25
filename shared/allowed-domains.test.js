const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDomain, matchesAllowedDomains, validateDomainList } = require('./allowed-domains');

test('normalizes origins and preserves ports', () => {
  assert.equal(normalizeDomain('https://Example.com:8443/'), 'https://example.com:8443');
  assert.equal(normalizeDomain('example.com'), 'https://example.com');
});
test('rejects unsafe domain inputs', () => {
  for (const value of ['localhost', '127.0.0.1', 'https://example.com/path', '*']) assert.equal(normalizeDomain(value), null);
});
test('matches only strict origins and subdomain wildcards', () => {
  assert.equal(matchesAllowedDomains('https://shop.example.com', ['*.example.com']), true);
  assert.equal(matchesAllowedDomains('https://example.com', ['*.example.com']), false);
  assert.equal(matchesAllowedDomains('http://shop.example.com', ['*.example.com']), false);
});
test('deduplicates a valid list', () => {
  assert.deepEqual(validateDomainList(['example.com', 'https://example.com/']).value, ['https://example.com']);
});
