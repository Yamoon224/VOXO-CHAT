const express = require('express');
const request = require('supertest');

jest.mock('../services/openaiService', () => ({ validateOwnerSuggestions: jest.fn() }));
jest.mock('../services/tenantDeletionService', () => ({ deleteTenant: jest.fn() }));
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => { req.user = { id: 'owner-1', role: 'owner' }; next(); },
}));

const tenantRoutes = require('./tenantRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('PUT /api/tenant/allowed-apps', () => {
  let app;
  let tenant;

  beforeEach(() => {
    tenant = { id: 'tenant-1', update: jest.fn(async data => Object.assign(tenant, data)) };
    app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.tenant = tenant; next(); });
    app.use('/api/tenant', tenantRoutes);
    app.use(errorHandler);
  });

  const put = body => request(app).put('/api/tenant/allowed-apps').send(body);

  test('stores a normalized, deduplicated list and the enforcement flag', async () => {
    const response = await put({ allowedAppIds: [' com.exemple.app ', 'COM.EXEMPLE.APP', 'fr.exemple.ios'], enforceAppIds: true });
    expect(response.status).toBe(200);
    expect(tenant.update).toHaveBeenCalledWith({ allowedAppIds: ['com.exemple.app', 'fr.exemple.ios'], enforceAppIds: true });
    expect(response.body.data).toEqual({ allowedAppIds: ['com.exemple.app', 'fr.exemple.ios'], enforceAppIds: true });
  });

  test('refuses to enforce an empty list: it would lock every app out', async () => {
    const response = await put({ allowedAppIds: [], enforceAppIds: true });
    expect(response.status).toBe(200);
    expect(tenant.update).toHaveBeenCalledWith({ allowedAppIds: [], enforceAppIds: false });
  });

  test('rejects an invalid identifier with a clear code', async () => {
    const response = await put({ allowedAppIds: ['com.ok', 'https://pas-un-id'] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_ALLOWED_APP_IDS');
    expect(tenant.update).not.toHaveBeenCalled();
  });
});
