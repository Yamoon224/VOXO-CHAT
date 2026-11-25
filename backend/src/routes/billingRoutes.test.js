jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', role: req.headers['x-role'] || 'owner' };
    req.tenant = { id: 'tenant-1' };
    next();
  },
}));
jest.mock('../controllers/billingController', () => ({
  updateCurrency: jest.fn((_req, res) => res.json({ currency: 'EUR' })),
  createPlanChangeRequest: jest.fn((req, res) => res.status(201).json({ requestedPlan: req.body.requestedPlan })),
}));

const express = require('express');
const request = require('supertest');
const routes = require('./billingRoutes');
const controller = require('../controllers/billingController');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('billingRoutes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/tenant/billing', routes);
    app.use(errorHandler);
  });

  test.each(['owner', 'admin'])('accepts plan requests from %s', async (role) => {
    const response = await request(app).post('/api/tenant/billing/plan-change-requests')
      .set('x-role', role).send({ requestedPlan: 'pro' });
    expect(response.status).toBe(201);
    expect(controller.createPlanChangeRequest).toHaveBeenCalled();
  });

  test('rejects a plan request from a regular member', async () => {
    const response = await request(app).post('/api/tenant/billing/plan-change-requests')
      .set('x-role', 'user').send({ requestedPlan: 'pro' });
    expect(response.status).toBe(403);
    expect(controller.createPlanChangeRequest).not.toHaveBeenCalled();
  });

  test('rejects an unknown plan before calling the controller', async () => {
    const response = await request(app).post('/api/tenant/billing/plan-change-requests')
      .send({ requestedPlan: 'gold' });
    expect(response.status).toBe(400);
    expect(controller.createPlanChangeRequest).not.toHaveBeenCalled();
  });
});
