jest.mock('../services/emailVerificationService', () => ({
  confirmVerification: jest.fn(),
  resendVerification: jest.fn(),
}));
jest.mock('../services/authSessionService', () => ({
  buildSession: jest.fn(async (user, tenant) => ({
    user: user.toJSON(),
    tenant,
    tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
  })),
}));

const express = require('express');
const request = require('supertest');
const emailVerificationService = require('../services/emailVerificationService');
const { verifyEmail, resendVerification } = require('./emailVerificationController');
const { validate } = require('../middleware/validationMiddleware');
const { verifyEmailSchema, resendVerificationSchema } = require('../validators/authValidators');
const { errorHandler, AppError } = require('../middleware/errorMiddleware');

const TOKEN = 'a'.repeat(64);

const buildUser = () => ({
  id: 'user-1',
  email: 'guy@example.com',
  toJSON: () => ({ id: 'user-1', email: 'guy@example.com' }),
});

describe('emailVerificationController', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
    app.post('/resend-verification', validate(resendVerificationSchema), resendVerification);
    app.use(errorHandler);
  });

  describe('verify-email', () => {
    const post = () => request(app).post('/verify-email').send({ token: TOKEN });

    test('returns a full session so the user is logged in straight away', async () => {
      emailVerificationService.confirmVerification.mockResolvedValue({
        user: buildUser(),
        tenant: { id: 'tenant-1', name: 'Acme', settings: {} },
      });

      const response = await post();

      expect(response.status).toBe(200);
      expect(response.body.data.user).toMatchObject({ id: 'user-1' });
      expect(response.body.data.tenant).toMatchObject({ id: 'tenant-1' });
      expect(response.body.data.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('propagates 410 on an expired link', async () => {
      emailVerificationService.confirmVerification.mockRejectedValue(
        new AppError('Ce lien a expiré', 410, { code: 'TOKEN_EXPIRED' })
      );

      const response = await post();

      expect(response.status).toBe(410);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    test('propagates 400 when the link was already used', async () => {
      emailVerificationService.confirmVerification.mockRejectedValue(
        new AppError('Ce lien est invalide ou a déjà été utilisé', 400, { code: 'TOKEN_INVALID' })
      );

      const response = await post();

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    test('rejects a missing token before reaching the service', async () => {
      const response = await request(app).post('/verify-email').send({});

      expect(response.status).toBe(400);
      expect(emailVerificationService.confirmVerification).not.toHaveBeenCalled();
    });
  });

  describe('resend-verification', () => {
    const post = (email = 'guy@example.com') => request(app)
      .post('/resend-verification').send({ email });

    test('returns the same response whether the account exists or not', async () => {
      emailVerificationService.resendVerification.mockResolvedValue('sent');
      const existing = await post();

      emailVerificationService.resendVerification.mockResolvedValue('skipped');
      const missing = await post('ghost@example.com');

      expect(missing.status).toBe(200);
      expect(missing.status).toBe(existing.status);
      expect(missing.body.message).toBe(existing.body.message);
    });

    test('surfaces a provider outage instead of faking a success', async () => {
      emailVerificationService.resendVerification.mockResolvedValue('failed');

      const response = await post();

      expect(response.status).toBe(502);
      expect(response.body.code).toBe('EMAIL_SEND_FAILED');
    });

    test('an outage response does not reveal whether the account exists', async () => {
      // La panne est indépendante du compte : le message ne doit citer ni
      // l'adresse ni l'existence du compte.
      emailVerificationService.resendVerification.mockResolvedValue('failed');

      const response = await post('ghost@example.com');

      expect(response.body.error).not.toContain('ghost@example.com');
      expect(response.body.error).not.toMatch(/compte/i);
    });

    test('never echoes a token in the response body', async () => {
      emailVerificationService.resendVerification.mockResolvedValue('sent');

      const response = await post();

      expect(JSON.stringify(response.body)).not.toMatch(/[0-9a-f]{64}/);
    });
  });
});
