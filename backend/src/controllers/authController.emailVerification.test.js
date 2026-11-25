jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
  Tenant: {},
}));

jest.mock('../services/tenantProvisioningService', () => ({
  createTenantWithOwner: jest.fn(),
}));

jest.mock('../services/emailVerificationService', () => ({
  sendVerification: jest.fn(),
}));

// Les caractéristiques du tenant sont désormais dérivées du forfait à la
// lecture : on neutralise cette lecture, elle a sa propre couverture.
jest.mock('../services/tenantFeatureFlags', () => ({
  computeTenantFeatures: jest.fn().mockResolvedValue({}),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');
const tenantProvisioningService = require('../services/tenantProvisioningService');
const emailVerificationService = require('../services/emailVerificationService');
const { register, login, refreshToken } = require('./authController');
const { errorHandler } = require('../middleware/errorMiddleware');

const TENANT = { id: 'tenant-1', name: 'Acme', settings: {} };

const buildUser = (overrides = {}) => ({
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'guy@example.com',
  emailVerifiedAt: null,
  tenant: TENANT,
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(undefined),
  toJSON: () => ({ id: 'user-1', email: 'guy@example.com' }),
  ...overrides,
});

const makeRefreshToken = () => jwt.sign(
  { id: 'user-1', tenantId: 'tenant-1', type: 'refresh' },
  config.jwt.secret
);

describe('authController — vérification email', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.post('/register', register);
    app.post('/login', login);
    app.post('/refresh-token', refreshToken);
    app.use(errorHandler);
  });

  describe('register', () => {
    const payload = {
      companyName: 'Acme',
      firstName: 'Guy',
      lastName: 'Jo',
      email: 'guy@example.com',
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
    };

    beforeEach(() => {
      tenantProvisioningService.createTenantWithOwner
        .mockResolvedValue({ tenant: TENANT, user: buildUser() });
    });

    test('does not open a session and flags the pending verification', async () => {
      emailVerificationService.sendVerification.mockResolvedValue(true);

      const response = await request(app).post('/register').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data.tokens).toBeUndefined();
      expect(response.body.data).toMatchObject({
        requiresEmailVerification: true,
        verificationEmailSent: true,
      });
    });

    test('still creates the account when the provider is unavailable', async () => {
      emailVerificationService.sendVerification.mockResolvedValue(false);

      const response = await request(app).post('/register').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data.verificationEmailSent).toBe(false);
      expect(tenantProvisioningService.createTenantWithOwner).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const post = () => request(app).post('/login')
      .send({ email: 'guy@example.com', password: 'Secret123!' });

    test('refuses an unverified account with EMAIL_NOT_VERIFIED', async () => {
      User.findOne.mockResolvedValue(buildUser({ emailVerifiedAt: null }));

      const response = await post();

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(response.body.details).toMatchObject({ email: 'guy@example.com' });
    });

    test('lets a verified account through', async () => {
      User.findOne.mockResolvedValue(buildUser({ emailVerifiedAt: new Date() }));

      const response = await post();

      expect(response.status).toBe(200);
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    });

    test('does not leak verification state on a wrong password', async () => {
      User.findOne.mockResolvedValue(buildUser({
        emailVerifiedAt: null,
        comparePassword: jest.fn().mockResolvedValue(false),
      }));

      const response = await post();

      expect(response.status).toBe(401);
      expect(response.body.code).toBeUndefined();
    });
  });

  describe('refresh-token', () => {
    const post = () => request(app).post('/refresh-token')
      .send({ refreshToken: makeRefreshToken() });

    test('refuses to refresh an unverified account', async () => {
      User.findOne.mockResolvedValue(buildUser({ emailVerifiedAt: null }));

      const response = await post();

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('refreshes a verified account', async () => {
      User.findOne.mockResolvedValue(buildUser({ emailVerifiedAt: new Date() }));

      const response = await post();

      expect(response.status).toBe(200);
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    });
  });
});
