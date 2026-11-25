const express = require('express');
const request = require('supertest');

jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'actor-1', role: req.get('x-test-role') || 'owner', permissionOverrides: {} };
    next();
  },
}));
jest.mock('../controllers/integrationController', () => ({
  list: (req, res) => res.json({ success: true }),
  save: (req, res) => res.json({ success: true }),
  sync: (req, res) => res.json({ success: true }),
  disconnect: (req, res) => res.json({ success: true }),
  jobs: (req, res) => res.json({ success: true }),
  startMicrosoft: (req, res) => res.json({ success: true }),
}));

const routes = require('./integrationRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('integration routes permissions', () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.tenant = { id: 'tenant-1' }; next(); });
  app.use('/api/integrations', routes);
  app.use(errorHandler);

  test('allows a knowledge reader to list connectors', async () => {
    const response = await request(app).get('/api/integrations').set('x-test-role', 'user');
    expect(response.status).toBe(200);
  });

  test('refuses a knowledge reader from connecting a provider', async () => {
    const response = await request(app).post('/api/integrations').set('x-test-role', 'user').send({ provider: 'wordpress' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  test('allows a knowledge writer to start a sync', async () => {
    const response = await request(app).post('/api/integrations/connector-1/sync').set('x-test-role', 'admin');
    expect(response.status).toBe(200);
  });
});
