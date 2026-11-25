jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(() => ({ id: 'user-1', tenantId: 'tenant-1', type: 'refresh' })),
}));

jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
  },
  Tenant: {},
}));

const { User } = require('../models');
const controller = require('./authController');

describe('authController disabled team member access', () => {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(null);
  });

  test('login only searches active users', async () => {
    const next = jest.fn();
    await controller.login({
      body: { email: 'disabled@example.com', password: 'Secret123!' },
    }, response, next);

    expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ email: 'disabled@example.com', isActive: true }),
    }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  test('refresh token only searches active users', async () => {
    const next = jest.fn();
    await controller.refreshToken({ body: { refreshToken: 'refresh-token' } }, response, next);

    expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'user-1', tenantId: 'tenant-1', isActive: true }),
    }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
