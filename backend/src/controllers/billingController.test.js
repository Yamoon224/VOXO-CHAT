jest.mock('../services/planService', () => ({ listPlans: jest.fn() }));
jest.mock('../services/planChangeRequestService', () => ({ create: jest.fn() }));

const billingController = require('./billingController');
const planService = require('../services/planService');
const planChangeRequestService = require('../services/planChangeRequestService');

describe('billingController', () => {
  const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  beforeEach(() => jest.clearAllMocks());

  test('returns the public plan catalogue', async () => {
    const plans = [{ name: 'free', priceAmount: 0 }];
    const res = response();
    planService.listPlans.mockResolvedValue(plans);

    await billingController.getPlans({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ plans, currency: 'EUR' }) }));
  });

  test('persists the tenant display currency', async () => {
    const tenant = { settings: {}, update: jest.fn() };
    const res = response();
    await billingController.updateCurrency({ tenant, body: { currency: 'XOF' } }, res, jest.fn());
    expect(tenant.update).toHaveBeenCalledWith({ settings: { billing: { currency: 'XOF' } } });
  });

  test('delegates a validated plan-change request with tenant and actor context', async () => {
    const req = { tenant: { id: 'tenant-1' }, user: { id: 'owner-1' }, body: { requestedPlan: 'pro', note: '' } };
    const res = response();
    planChangeRequestService.create.mockResolvedValue({ id: 'ticket-1' });

    await billingController.createPlanChangeRequest(req, res, jest.fn());

    expect(planChangeRequestService.create).toHaveBeenCalledWith(expect.objectContaining({
      tenant: req.tenant, actor: req.user, requestedPlan: 'pro',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
