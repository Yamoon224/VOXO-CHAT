jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', tenantId: 'tenant-1', role: 'owner' };
    next();
  },
}));

jest.mock('../services/accountDeletionService', () => ({
  getDeletionPreview: jest.fn(),
  deleteAccount: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const routes = require('./accountDeletionRoutes');
const accountDeletionService = require('../services/accountDeletionService');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('accountDeletionRoutes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', routes);
    app.use(errorHandler);
  });

  test('returns the deletion preview for the authenticated user', async () => {
    accountDeletionService.getDeletionPreview.mockResolvedValue({
      isOwner: true, transferRequired: true, eligibleOwners: [],
    });

    const response = await request(app).get('/api/auth/account/deletion-preview');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ transferRequired: true });
    expect(accountDeletionService.getDeletionPreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' })
    );
  });

  test('refuses a deletion without the current password', async () => {
    const response = await request(app).delete('/api/auth/account').send({});

    expect(response.status).toBe(400);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test('rejects a malformed successor id before touching the service', async () => {
    const response = await request(app)
      .delete('/api/auth/account')
      .send({ currentPassword: 'Secret1!', newOwnerId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(accountDeletionService.deleteAccount).not.toHaveBeenCalled();
  });

  test('forwards the confirmation payload and returns the purge date', async () => {
    const purgeAt = new Date('2026-09-05T00:00:00.000Z');
    accountDeletionService.deleteAccount.mockResolvedValue({ scope: 'company', purgeAt });

    const response = await request(app)
      .delete('/api/auth/account')
      .send({ currentPassword: 'Secret1!', confirmCompanyDeletion: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ scope: 'company' });
    expect(accountDeletionService.deleteAccount).toHaveBeenCalledWith(expect.objectContaining({
      currentPassword: 'Secret1!',
      confirmCompanyDeletion: true,
    }));
  });
});
