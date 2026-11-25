jest.mock('../config/config', () => ({
  agentAction: { encryptionKey: '0'.repeat(64) },
}));

const cryptoUtils = require('./cryptoUtils');

describe('cryptoUtils', () => {
  test('round-trips a plaintext secret', () => {
    const encrypted = cryptoUtils.encrypt('sk_live_super_secret');
    expect(encrypted).not.toContain('sk_live_super_secret');
    expect(cryptoUtils.decrypt(encrypted)).toBe('sk_live_super_secret');
  });

  test('produces a different ciphertext each time (random IV)', () => {
    const first = cryptoUtils.encrypt('same-secret');
    const second = cryptoUtils.encrypt('same-secret');
    expect(first).not.toBe(second);
  });

  test('fails to decrypt a tampered payload instead of returning garbage', () => {
    const encrypted = cryptoUtils.encrypt('sk_live_super_secret');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    const tampered = [iv, authTag, `${ciphertext.slice(0, -2)}xx`].join(':');
    expect(() => cryptoUtils.decrypt(tampered)).toThrow();
  });

  test('rejects a malformed payload', () => {
    expect(() => cryptoUtils.decrypt('not-a-valid-payload')).toThrow('Secret chiffré invalide.');
  });
});

describe('cryptoUtils without a configured key', () => {
  beforeEach(() => jest.resetModules());

  test('throws an operational error rather than crashing', () => {
    jest.doMock('../config/config', () => ({ agentAction: { encryptionKey: undefined } }));
    const isolatedCryptoUtils = require('./cryptoUtils');
    expect(() => isolatedCryptoUtils.encrypt('secret')).toThrow('AGENT_ACTION_ENCRYPTION_KEY');
  });
});
