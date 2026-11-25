const express = require('express');
const request = require('supertest');

jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 'actor-1',
      role: req.get('x-test-role') || 'owner',
      permissionOverrides: { agentic: req.get('x-agentic') || (req.get('x-test-role') === 'user' ? 'read' : 'write') },
    };
    next();
  },
}));
jest.mock('../services/agentActionService', () => ({
  list: jest.fn(async () => []),
  create: jest.fn(async () => ({ id: 'action-1' })),
  update: jest.fn(async () => ({ id: 'action-1' })),
  remove: jest.fn(async () => {}),
  findOwned: jest.fn(async () => ({ id: 'action-1' })),
}));
jest.mock('../services/agentToolExecutorService', () => ({ execute: jest.fn(async () => ({ success: true })) }));

const agentActionService = require('../services/agentActionService');
const agentActionRoutes = require('./agentActionRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('agent action routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenant = { id: 'tenant-1' };
      next();
    });
    app.use('/api/tenant/agent-actions', agentActionRoutes);
    app.use(errorHandler);
  });

  const validPayload = {
    name: 'check_order_status',
    description: 'Vérifie le statut d\'une commande',
    method: 'GET',
    endpointUrl: 'https://api.tenant-business.com/orders',
    parametersSchema: { type: 'object', properties: {}, required: [] },
  };

  test('a standard user (read-only on company) can list actions', async () => {
    const response = await request(app)
      .get('/api/tenant/agent-actions')
      .set('x-test-role', 'user');

    expect(response.status).toBe(200);
    expect(agentActionService.list).toHaveBeenCalledWith('tenant-1');
  });

  test('a standard user cannot create an action', async () => {
    const response = await request(app)
      .post('/api/tenant/agent-actions')
      .set('x-test-role', 'user')
      .send(validPayload);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
    expect(agentActionService.create).not.toHaveBeenCalled();
  });

  test('an admin can create an action', async () => {
    const response = await request(app)
      .post('/api/tenant/agent-actions')
      .set('x-test-role', 'admin')
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(agentActionService.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ name: 'check_order_status' }));
  });

  test('rejects a creation payload with an invalid name', async () => {
    const response = await request(app)
      .post('/api/tenant/agent-actions')
      .set('x-test-role', 'admin')
      .send({ ...validPayload, name: 'Not Snake Case' });

    expect(response.status).toBe(400);
    expect(agentActionService.create).not.toHaveBeenCalled();
  });

  test('rejects a creation payload with a non-http(s) endpoint URL', async () => {
    const response = await request(app)
      .post('/api/tenant/agent-actions')
      .set('x-test-role', 'admin')
      .send({ ...validPayload, endpointUrl: 'ftp://example.com/x' });

    expect(response.status).toBe(400);
    expect(agentActionService.create).not.toHaveBeenCalled();
  });

  test('a partial update only forwards the fields actually sent, not silently-defaulted ones', async () => {
    const response = await request(app)
      .put('/api/tenant/agent-actions/action-1')
      .set('x-test-role', 'admin')
      .send({ description: 'nouvelle description' });

    expect(response.status).toBe(200);
    const [, , payload] = agentActionService.update.mock.calls[0];
    expect(payload).toEqual({ description: 'nouvelle description' });
  });

  test('an admin can trigger the manual test endpoint', async () => {
    const response = await request(app)
      .post('/api/tenant/agent-actions/action-1/test')
      .set('x-test-role', 'admin')
      .send({ arguments: { order_id: '42' } });

    expect(response.status).toBe(200);
    expect(response.body.data.result).toEqual({ success: true });
  });

  test('a standard user cannot delete an action', async () => {
    const response = await request(app)
      .delete('/api/tenant/agent-actions/action-1')
      .set('x-test-role', 'user');

    expect(response.status).toBe(403);
    expect(agentActionService.remove).not.toHaveBeenCalled();
  });
});
