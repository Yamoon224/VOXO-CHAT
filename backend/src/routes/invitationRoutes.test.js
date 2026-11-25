jest.mock('../services/teamInvitationService', () => ({
  acceptInvitation: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const routes = require('./invitationRoutes');
const service = require('../services/teamInvitationService');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('invitationRoutes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', routes);
    app.use(errorHandler);
  });

  test('accepts a valid invitation payload', async () => {
    service.acceptInvitation.mockResolvedValue({ id: 'user-1', email: 'new@example.com' });
    const payload = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      token: 'a'.repeat(64),
      firstName: 'Grace',
      lastName: 'Hopper',
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
    };
    const response = await request(app).post('/api/auth/invitations/accept').send(payload);
    expect(response.status).toBe(201);
    expect(service.acceptInvitation).toHaveBeenCalledWith(payload);
  });

  test('rejects an invalid invitation token before the service', async () => {
    const response = await request(app).post('/api/auth/invitations/accept').send({
      tenantId: '11111111-1111-4111-8111-111111111111',
      token: 'invalid',
      firstName: 'Grace',
      lastName: 'Hopper',
      password: 'Secret123!',
      confirmPassword: 'Secret123!',
    });
    expect(response.status).toBe(400);
    expect(service.acceptInvitation).not.toHaveBeenCalled();
  });
});
