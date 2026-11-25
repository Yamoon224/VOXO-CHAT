jest.mock('../models', () => ({
  AdminUser: { findOne: jest.fn() },
  AdminRole: {},
}));

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { AdminUser } = require('../models');
const { authenticateAdmin } = require('./adminAuthMiddleware');

const runMiddleware = async (token) => {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const next = jest.fn();
  await authenticateAdmin(req, {}, next);
  return { req, next, error: next.mock.calls[0]?.[0] };
};

describe('authenticateAdmin', () => {
  const admin = { id: 'admin-1', isActive: true, save: jest.fn(), role: { isSystem: true } };

  beforeEach(() => {
    jest.clearAllMocks();
    AdminUser.findOne.mockResolvedValue(admin);
  });

  test('accepts a token carrying the admin scope', async () => {
    const token = jwt.sign({ id: 'admin-1', scope: 'admin' }, config.jwt.secret);

    const { req, next } = await runMiddleware(token);

    expect(next).toHaveBeenCalledWith();
    expect(req.adminUser).toBe(admin);
  });

  // Cœur de l'étanchéité entre les deux plateformes : un jeton de session
  // tenant est signé avec le même secret mais ne porte pas `scope: 'admin'`.
  test('rejects a valid tenant session token', async () => {
    const tenantToken = jwt.sign({ id: 'user-1', tenantId: 'tenant-1' }, config.jwt.secret);

    const { next, error } = await runMiddleware(tenantToken);

    expect(error).toMatchObject({ statusCode: 401, code: 'ADMIN_TOKEN_INVALID' });
    expect(AdminUser.findOne).not.toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeDefined();
  });

  test('rejects a refresh token used as an access token', async () => {
    const refresh = jwt.sign({ id: 'admin-1', scope: 'admin', type: 'refresh' }, config.jwt.secret);

    const { error } = await runMiddleware(refresh);

    expect(error).toMatchObject({ statusCode: 401, code: 'ADMIN_TOKEN_INVALID' });
    expect(AdminUser.findOne).not.toHaveBeenCalled();
  });

  test('rejects a request without an Authorization header', async () => {
    const { error } = await runMiddleware(null);

    expect(error).toMatchObject({ statusCode: 401, code: 'AUTH_REQUIRED' });
  });

  test('rejects a blocked or unknown admin account', async () => {
    AdminUser.findOne.mockResolvedValue(null);
    const token = jwt.sign({ id: 'admin-1', scope: 'admin' }, config.jwt.secret);

    const { error } = await runMiddleware(token);

    expect(AdminUser.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'admin-1', isActive: true },
    }));
    expect(error).toMatchObject({ statusCode: 401, code: 'ADMIN_NOT_FOUND' });
  });
});
