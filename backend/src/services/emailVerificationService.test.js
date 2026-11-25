jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
  Tenant: {},
}));

jest.mock('./authTokenService', () => ({
  TOKEN_TYPES: { PASSWORD_RESET: 'password_reset', EMAIL_VERIFICATION: 'email_verification' },
  issue: jest.fn(),
  consume: jest.fn(),
}));

jest.mock('./emailService', () => ({
  sendEmailVerification: jest.fn(),
}));

const { User } = require('../models');
const authTokenService = require('./authTokenService');
const emailService = require('./emailService');
const service = require('./emailVerificationService');

const buildUser = (overrides = {}) => ({
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'guy@example.com',
  firstName: 'Guy',
  pendingEmail: null,
  emailVerifiedAt: null,
  tenant: { id: 'tenant-1', name: 'Acme' },
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('emailVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authTokenService.issue.mockResolvedValue({ token: 'raw-token', expiresInMs: 1 });
    emailService.sendEmailVerification.mockResolvedValue(true);
  });

  describe('sendVerification', () => {
    test('issues a 24h verification token and mails the current address', async () => {
      await expect(service.sendVerification(buildUser())).resolves.toBe(true);

      expect(authTokenService.issue)
        .toHaveBeenCalledWith('user-1', 'email_verification');
      expect(emailService.sendEmailVerification).toHaveBeenCalledWith(expect.objectContaining({
        email: 'guy@example.com',
        firstName: 'Guy',
        expiresInHours: 24,
        verifyUrl: expect.stringContaining('/auth/verify-email?token=raw-token'),
      }));
    });

    test('targets the pending address when an email change is in flight', async () => {
      await service.sendVerification(buildUser({ pendingEmail: 'new@example.com' }));

      expect(emailService.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' })
      );
    });

    test('reports false instead of throwing when the provider is down', async () => {
      emailService.sendEmailVerification.mockResolvedValue(false);

      await expect(service.sendVerification(buildUser())).resolves.toBe(false);
    });
  });

  describe('confirmVerification', () => {
    test('marks the account verified', async () => {
      const user = buildUser();
      authTokenService.consume.mockResolvedValue({ userId: 'user-1' });
      User.findOne.mockResolvedValue(user);

      const result = await service.confirmVerification('raw-token');

      expect(authTokenService.consume).toHaveBeenCalledWith('raw-token', 'email_verification');
      expect(user.update).toHaveBeenCalledWith({ emailVerifiedAt: expect.any(Date) });
      expect(result.tenant).toEqual({ id: 'tenant-1', name: 'Acme' });
    });

    test('swaps the pending address into email and clears it', async () => {
      const user = buildUser({ pendingEmail: 'new@example.com' });
      authTokenService.consume.mockResolvedValue({ userId: 'user-1' });
      User.findOne.mockResolvedValue(user);

      await service.confirmVerification('raw-token');

      expect(user.update).toHaveBeenCalledWith({
        emailVerifiedAt: expect.any(Date),
        email: 'new@example.com',
        pendingEmail: null,
      });
    });

    test('rejects when the account no longer exists', async () => {
      authTokenService.consume.mockResolvedValue({ userId: 'user-1' });
      User.findOne.mockResolvedValue(null);

      await expect(service.confirmVerification('raw-token'))
        .rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
    });
  });

  describe('resendVerification', () => {
    test('skips silently when no account matches', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(service.resendVerification('ghost@example.com')).resolves.toBe('skipped');
      expect(authTokenService.issue).not.toHaveBeenCalled();
    });

    test('skips silently for an already verified account', async () => {
      User.findOne.mockResolvedValue(buildUser({ emailVerifiedAt: new Date() }));

      await expect(service.resendVerification('guy@example.com')).resolves.toBe('skipped');
      expect(authTokenService.issue).not.toHaveBeenCalled();
    });

    test('resends for a verified account that has a pending address', async () => {
      User.findOne.mockResolvedValue(buildUser({
        emailVerifiedAt: new Date(),
        pendingEmail: 'new@example.com',
      }));

      await expect(service.resendVerification('new@example.com')).resolves.toBe('sent');
      expect(authTokenService.issue).toHaveBeenCalled();
    });

    test('reports a provider outage separately from a missing account', async () => {
      User.findOne.mockResolvedValue(buildUser());
      emailService.sendEmailVerification.mockResolvedValue(false);

      await expect(service.resendVerification('guy@example.com')).resolves.toBe('failed');
    });
  });

  describe('requestEmailChange', () => {
    test('stores the address as pending without touching the login email', async () => {
      const user = buildUser();
      User.findOne.mockResolvedValue(null); // aucun doublon

      await service.requestEmailChange(user, 'new@example.com');

      expect(user.update).toHaveBeenCalledWith({ pendingEmail: 'new@example.com' });
      expect(user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' })
      );
    });

    test('rejects an address already used by another account', async () => {
      const user = buildUser();
      User.findOne.mockResolvedValue({ id: 'other-user' });

      await expect(service.requestEmailChange(user, 'taken@example.com'))
        .rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_USED' });
      expect(user.update).not.toHaveBeenCalled();
    });
  });
});
