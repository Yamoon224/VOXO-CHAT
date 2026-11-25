jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
  Tenant: {},
}));

jest.mock('../services/passwordResetService', () => ({
  requestReset: jest.fn(),
  confirmReset: jest.fn(),
  notifyPasswordChanged: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { User } = require('../models');
const passwordResetService = require('../services/passwordResetService');
const { forgotPassword, resetPassword } = require('./passwordController');
const { validate } = require('../middleware/validationMiddleware');
const { forgotPasswordSchema, resetPasswordSchema } = require('../validators/authValidators');
const { errorHandler } = require('../middleware/errorMiddleware');
const { AppError } = require('../middleware/errorMiddleware');

const VALID_PASSWORD = 'Secret123!';

describe('passwordController', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
    app.post('/reset-password', validate(resetPasswordSchema), resetPassword);
    app.use(errorHandler);
  });

  describe('forgot-password', () => {
    const post = () => request(app).post('/forgot-password').send({ email: 'user@example.com' });

    test('sends a reset email when the account exists', async () => {
      User.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      passwordResetService.requestReset.mockResolvedValue(true);

      const response = await post();

      expect(response.status).toBe(200);
      expect(passwordResetService.requestReset).toHaveBeenCalled();
    });

    test('returns the exact same response when the account does not exist', async () => {
      User.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      const existing = await post();

      jest.clearAllMocks();
      User.findOne.mockResolvedValue(null);
      const missing = await post();

      expect(missing.status).toBe(existing.status);
      expect(missing.body.message).toBe(existing.body.message);
      expect(passwordResetService.requestReset).not.toHaveBeenCalled();
    });

    test('stays neutral even when the email provider is down', async () => {
      User.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      // requestReset absorbe l'échec (sendBestEffort) : la route ne doit pas 502
      passwordResetService.requestReset.mockResolvedValue(false);

      const response = await post();

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Si cet email existe');
    });

    test('never echoes a token in the response body', async () => {
      User.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      passwordResetService.requestReset.mockResolvedValue(true);

      const response = await post();

      expect(JSON.stringify(response.body)).not.toMatch(/[0-9a-f]{64}/);
    });
  });

  describe('reset-password', () => {
    const post = (body) => request(app).post('/reset-password').send(body);

    test('resets the password with a valid token', async () => {
      passwordResetService.confirmReset.mockResolvedValue({ id: 'user-1' });

      const response = await post({
        token: 'a'.repeat(64),
        newPassword: VALID_PASSWORD,
        confirmNewPassword: VALID_PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(passwordResetService.confirmReset).toHaveBeenCalledWith({
        token: 'a'.repeat(64),
        newPassword: VALID_PASSWORD,
      });
    });

    test('propagates 410 TOKEN_EXPIRED so the UI can offer a new link', async () => {
      passwordResetService.confirmReset.mockRejectedValue(
        new AppError('Ce lien a expiré', 410, { code: 'TOKEN_EXPIRED' })
      );

      const response = await post({
        token: 'a'.repeat(64),
        newPassword: VALID_PASSWORD,
        confirmNewPassword: VALID_PASSWORD,
      });

      expect(response.status).toBe(410);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    test('rejects a token already used', async () => {
      passwordResetService.confirmReset.mockRejectedValue(
        new AppError('Ce lien est invalide ou a déjà été utilisé', 400, { code: 'TOKEN_INVALID' })
      );

      const response = await post({
        token: 'a'.repeat(64),
        newPassword: VALID_PASSWORD,
        confirmNewPassword: VALID_PASSWORD,
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    test('rejects mismatching passwords before touching the service', async () => {
      const response = await post({
        token: 'a'.repeat(64),
        newPassword: VALID_PASSWORD,
        confirmNewPassword: 'Different123!',
      });

      expect(response.status).toBe(400);
      expect(passwordResetService.confirmReset).not.toHaveBeenCalled();
    });
  });
});
