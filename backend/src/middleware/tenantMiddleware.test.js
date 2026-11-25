jest.mock('../models', () => ({
  Tenant: {
    findOne: jest.fn(),
  },
}));

const { Tenant } = require('../models');
const {
  resolveTenantFromParam,
  validateTenantAccess,
} = require('./tenantMiddleware');

function createResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

describe('tenant middleware route resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('attaches an active tenant resolved from the route parameter', async () => {
    const tenant = { id: 'tenant-1' };
    Tenant.findOne.mockResolvedValue(tenant);
    const req = { params: { tenantId: 'tenant-1' } };
    const res = createResponse();
    const next = jest.fn();

    await resolveTenantFromParam()(req, res, next);

    expect(Tenant.findOne).toHaveBeenCalledWith({
      where: { id: 'tenant-1', isActive: true },
    });
    expect(req.tenant).toBe(tenant);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('acknowledges an unknown inbound-webhook tenant without continuing', async () => {
    Tenant.findOne.mockResolvedValue(null);
    const req = { params: { tenantId: 'missing' } };
    const res = createResponse();
    const next = jest.fn();

    await resolveTenantFromParam({ acknowledgeMissing: true })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Tenant not found');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 404 for an unknown tenant on a managed route', async () => {
    Tenant.findOne.mockResolvedValue(null);
    const req = { params: { tenantId: 'missing' } };
    const res = createResponse();

    await resolveTenantFromParam()(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TENANT_NOT_FOUND',
    }));
  });

  test('refuses authenticated access to another tenant', async () => {
    const req = {
      user: { tenantId: 'tenant-1' },
      tenant: { id: 'tenant-2' },
    };
    const res = createResponse();
    const next = jest.fn();

    await validateTenantAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TENANT_ACCESS_DENIED',
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
