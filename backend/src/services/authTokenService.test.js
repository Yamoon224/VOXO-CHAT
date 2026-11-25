jest.mock('../models', () => ({
  AuthToken: {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
    LOCK: { UPDATE: 'UPDATE' },
  },
}));

const { AuthToken, sequelize } = require('../models');
const authTokenService = require('./authTokenService');

const HOUR = 60 * 60 * 1000;

describe('authTokenService', () => {
  let transaction;

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
    sequelize.transaction.mockResolvedValue(transaction);
    AuthToken.create.mockResolvedValue({});
    AuthToken.update.mockResolvedValue([1]);
  });

  describe('issue', () => {
    test('persists only the hash, never the raw token', async () => {
      const { token } = await authTokenService.issue('user-1', 'password_reset');

      expect(token).toMatch(/^[0-9a-f]{64}$/);
      const created = AuthToken.create.mock.calls[0][0];
      expect(created.tokenHash).toBe(authTokenService.hashToken(token));
      expect(JSON.stringify(created)).not.toContain(token);
    });

    test('invalidates the previous active token of the same type', async () => {
      await authTokenService.issue('user-1', 'password_reset');

      expect(AuthToken.update).toHaveBeenCalledWith(
        { consumedAt: expect.any(Date) },
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', type: 'password_reset' }),
        })
      );
    });

    test('applies the 1 hour TTL for a password reset', async () => {
      const before = Date.now();
      const { expiresInMs } = await authTokenService.issue('user-1', 'password_reset');

      expect(expiresInMs).toBe(HOUR);
      const { expiresAt } = AuthToken.create.mock.calls[0][0];
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + HOUR);
    });

    test('applies the 24 hours TTL for an email verification', async () => {
      const { expiresInMs } = await authTokenService.issue('user-1', 'email_verification');

      expect(expiresInMs).toBe(24 * HOUR);
    });

    test('rejects an unknown token type', async () => {
      await expect(authTokenService.issue('user-1', 'unknown'))
        .rejects.toMatchObject({ statusCode: 500, code: 'AUTH_TOKEN_TYPE_UNKNOWN' });
    });
  });

  describe('consume', () => {
    const activeToken = (overrides = {}) => ({
      userId: 'user-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + HOUR),
      update: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    test('marks the token consumed and returns its owner', async () => {
      const stored = activeToken();
      AuthToken.findOne.mockResolvedValue(stored);

      await expect(authTokenService.consume('raw-token', 'password_reset'))
        .resolves.toEqual({ userId: 'user-1' });

      expect(AuthToken.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { tokenHash: authTokenService.hashToken('raw-token'), type: 'password_reset' },
        lock: 'UPDATE',
      }));
      expect(stored.update).toHaveBeenCalledWith(
        { consumedAt: expect.any(Date) },
        { transaction }
      );
      expect(transaction.commit).toHaveBeenCalled();
    });

    test('rejects an unknown token', async () => {
      AuthToken.findOne.mockResolvedValue(null);

      await expect(authTokenService.consume('raw-token', 'password_reset'))
        .rejects.toMatchObject({ statusCode: 400, code: 'TOKEN_INVALID' });
      expect(transaction.rollback).toHaveBeenCalled();
    });

    test('rejects a token already consumed — single use', async () => {
      AuthToken.findOne.mockResolvedValue(activeToken({ consumedAt: new Date() }));

      await expect(authTokenService.consume('raw-token', 'password_reset'))
        .rejects.toMatchObject({ statusCode: 400, code: 'TOKEN_INVALID' });
    });

    test('rejects an expired token', async () => {
      AuthToken.findOne.mockResolvedValue(activeToken({
        expiresAt: new Date(Date.now() - 1000),
      }));

      await expect(authTokenService.consume('raw-token', 'password_reset'))
        .rejects.toMatchObject({ statusCode: 410, code: 'TOKEN_EXPIRED' });
    });
  });
});
