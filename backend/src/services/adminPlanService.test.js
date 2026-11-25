jest.mock('../models', () => ({ Plan: { findByPk: jest.fn() } }));
jest.mock('./planService', () => ({
  listPlans: jest.fn(),
  invalidate: jest.fn(),
  toPublicPlan: jest.fn(plan => plan),
}));

const { Plan } = require('../models');
const planService = require('./planService');
const service = require('./adminPlanService');

describe('adminPlanService', () => {
  const buildPlan = () => ({
    id: 'plan-1',
    name: 'basic',
    update: jest.fn(),
    get: () => ({ id: 'plan-1', name: 'basic' }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Plan.findByPk.mockResolvedValue(buildPlan());
  });

  test('rejects an unknown plan', async () => {
    Plan.findByPk.mockResolvedValue(null);

    await expect(service.updatePlan({ planId: 'nope', label: 'X' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'PLAN_NOT_FOUND' });
  });

  test('updates price, limits, document entitlements and features', async () => {
    const plan = buildPlan();
    Plan.findByPk.mockResolvedValue(plan);

    await service.updatePlan({
      planId: 'plan-1',
      label: '  Basique  ',
      priceAmount: 4900,
      messagesPerMonth: 800,
      allowVisitorAttachments: false,
      allowAgentAttachments: true,
      features: { leadGeneration: true },
    });

    expect(plan.update).toHaveBeenCalledWith({
      label: 'Basique',
      priceAmount: 4900,
      messagesPerMonth: 800,
      allowVisitorAttachments: false,
      allowAgentAttachments: true,
      features: { leadGeneration: true },
    });
  });

  /**
   * `null` rend une ressource illimitée : le distinguer d'un champ absent est
   * indispensable, sans quoi on ne pourrait jamais retirer une limite.
   */
  test('treats null as unlimited, not as an omitted field', async () => {
    const plan = buildPlan();
    Plan.findByPk.mockResolvedValue(plan);

    await service.updatePlan({ planId: 'plan-1', messagesPerMonth: null });

    expect(plan.update).toHaveBeenCalledWith({ messagesPerMonth: null });
  });

  test('leaves untouched every field that was not sent', async () => {
    const plan = buildPlan();
    Plan.findByPk.mockResolvedValue(plan);

    await service.updatePlan({ planId: 'plan-1', priceAmount: 100 });

    const [changes] = plan.update.mock.calls[0];
    expect(Object.keys(changes)).toEqual(['priceAmount']);
  });

  test('rejects an empty update instead of pretending it worked', async () => {
    await expect(service.updatePlan({ planId: 'plan-1' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'PLAN_NO_CHANGES' });
  });

  // Sans invalidation, l'édition n'aurait d'effet qu'à l'expiration du TTL.
  test('invalidates the plan cache so the change applies immediately', async () => {
    await service.updatePlan({ planId: 'plan-1', priceAmount: 100 });

    expect(planService.invalidate).toHaveBeenCalled();
  });
});
