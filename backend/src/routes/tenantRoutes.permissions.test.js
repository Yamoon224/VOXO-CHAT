const express = require('express');
const request = require('supertest');

jest.mock('../services/openaiService', () => ({ validateOwnerSuggestions: jest.fn() }));
jest.mock('../services/tenantDeletionService', () => ({ deleteTenant: jest.fn() }));
jest.mock('../services/tenantSettingsService', () => ({ updateSettings: jest.fn(async () => ({})) }));
jest.mock('../services/tenantFeatureFlags', () => ({ computeTenantFeatures: jest.fn(async () => ({})) }));

// L'acteur est décrit par son rôle et une éventuelle surcharge sur `company`.
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    const override = req.get('x-test-company');
    req.user = {
      id: 'actor-1',
      role: req.get('x-test-role') || 'owner',
      permissionOverrides: override ? { company: override } : {},
    };
    next();
  },
}));

const tenantRoutes = require('./tenantRoutes');
const tenantSettingsService = require('../services/tenantSettingsService');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('tenant routes permissions', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenant = {
        id: 'tenant-1',
        name: 'Acme',
        settings: { chatbot: { name: 'Assistant' } },
        update: jest.fn(async () => {}),
      };
      next();
    });
    app.use('/api/tenant', tenantRoutes);
    app.use(errorHandler);
  });

  const put = (path, role, company) => {
    const req = request(app).put(path).set('x-test-role', role);
    if (company) req.set('x-test-company', company);
    return req.send({ name: 'Nouvelle raison sociale' });
  };

  describe('PUT /settings', () => {
    test.each(['owner', 'admin'])('allows %s to change the company identity', async (role) => {
      const response = await put('/api/tenant/settings', role);

      expect(response.status).toBe(200);
      expect(tenantSettingsService.updateSettings).toHaveBeenCalled();
    });

    test('refuses a standard user, capped at read on company', async () => {
      const response = await put('/api/tenant/settings', 'user');

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
      expect(tenantSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    // Le plafond du rôle prime sur la surcharge : l'écriture reste hors de portée.
    test('still refuses a user even when granted company write', async () => {
      const response = await put('/api/tenant/settings', 'user', 'write');

      expect(response.status).toBe(403);
      expect(tenantSettingsService.updateSettings).not.toHaveBeenCalled();
    });
  });

  describe('PUT /chatbot-settings', () => {
    test('closes the hole that had no role check at all', async () => {
      const response = await put('/api/tenant/chatbot-settings', 'user');

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
    });

    test('still allows an admin', async () => {
      const response = await put('/api/tenant/chatbot-settings', 'admin');

      expect(response.status).toBe(200);
    });
  });

  describe('read access', () => {
    test('lets a standard user consult the chatbot settings', async () => {
      const response = await request(app)
        .get('/api/tenant/chatbot-settings')
        .set('x-test-role', 'user');

      expect(response.status).toBe(200);
    });

    test('refuses a member whose company access was cut off', async () => {
      const response = await request(app)
        .get('/api/tenant/chatbot-settings')
        .set('x-test-role', 'user')
        .set('x-test-company', 'none');

      expect(response.status).toBe(403);
    });

    // La coquille du dashboard doit rester lisible par tout le monde.
    test('keeps the tenant profile reachable without any company access', async () => {
      const response = await request(app)
        .get('/api/tenant/profile')
        .set('x-test-role', 'user')
        .set('x-test-company', 'none');

      expect(response.status).toBe(200);
    });
  });
});
