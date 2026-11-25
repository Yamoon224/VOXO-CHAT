const express = require('express');
const request = require('supertest');

jest.mock('../services/openaiService', () => ({ validateOwnerSuggestions: jest.fn() }));
jest.mock('../services/tenantDeletionService', () => ({ deleteTenant: jest.fn() }));
// Ces tests portent sur la validation des réglages, pas sur les accès : on
// authentifie un propriétaire pour que le vrai requirePermission laisse passer.
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'owner-1', role: 'owner' };
    next();
  },
}));

const tenantRoutes = require('./tenantRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('PUT /api/tenant/settings', () => {
  let app;
  let tenant;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant = {
      id: 'tenant-1',
      name: 'Acme',
      domain: 'https://acme.test',
      subdomain: 'acme',
      update: jest.fn(async (data) => Object.assign(tenant, data)),
    };

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenant = tenant;
      next();
    });
    app.use('/api/tenant', tenantRoutes);
    app.use(errorHandler);
  });

  const put = (body) => request(app).put('/api/tenant/settings').send(body);

  test('persists the company settings', async () => {
    const response = await put({ name: 'Voxo', domain: 'https://voxo.app', subdomain: 'voxo' });

    expect(response.status).toBe(200);
    expect(tenant.update).toHaveBeenCalledWith({
      name: 'Voxo',
      domain: 'https://voxo.app',
      subdomain: 'voxo',
    });
    expect(response.body.data).toMatchObject({ name: 'Voxo', subdomain: 'voxo' });
  });

  test('accepts a bare domain — requiring the scheme was the trap', async () => {
    const response = await put({ domain: 'voxo.app' });

    expect(response.status).toBe(200);
    expect(tenant.update).toHaveBeenCalledWith({ domain: 'voxo.app' });
  });

  test('an empty string clears the field instead of being ignored', async () => {
    const response = await put({ domain: '' });

    expect(response.status).toBe(200);
    expect(tenant.update).toHaveBeenCalledWith({ domain: '' });
  });

  test('leaves untouched fields alone', async () => {
    await put({ name: 'Voxo' });

    expect(tenant.update).toHaveBeenCalledWith({ name: 'Voxo' });
  });

  test.each([
    ['un nom trop court', { name: 'A' }],
    ['un site web invalide', { domain: 'pas une url du tout' }],
    ['un sous-domaine non alphanumérique', { subdomain: 'mon-entreprise' }],
    ['un sous-domaine trop court', { subdomain: 'ab' }],
  ])('rejects %s before touching the tenant', async (_label, body) => {
    const response = await put(body);

    expect(response.status).toBe(400);
    expect(tenant.update).not.toHaveBeenCalled();
  });

  test('turns a subdomain collision into a French 409', async () => {
    const conflict = new Error('duplicate');
    conflict.name = 'SequelizeUniqueConstraintError';
    conflict.errors = [{ path: 'subdomain' }];
    tenant.update.mockRejectedValue(conflict);

    const response = await put({ subdomain: 'dejapris' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('TENANT_FIELD_ALREADY_USED');
    expect(response.body.error).toContain('sous-domaine');
  });
});
