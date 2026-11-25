jest.mock('../models', () => ({
  sequelize: { query: jest.fn(), QueryTypes: { SELECT: 'SELECT' } },
}));
jest.mock('./planService', () => ({ listPlans: jest.fn() }));

const { sequelize } = require('../models');
const planService = require('./planService');
const service = require('./platformRevenueService');

const PLANS = [
  { name: 'free', label: 'Gratuit', priceAmount: 0, priceCurrency: 'EUR' },
  { name: 'basic', label: 'Basique', priceAmount: 2900, priceCurrency: 'EUR' },
  { name: 'pro', label: 'Pro', priceAmount: 9900, priceCurrency: 'EUR' },
];

describe('platformRevenueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    planService.listPlans.mockResolvedValue(PLANS);
  });

  test('sums plan prices across active tenants', async () => {
    sequelize.query.mockResolvedValue([
      { plan: 'basic', tenants: '3' },
      { plan: 'pro', tenants: '2' },
    ]);

    await expect(service.getMonthlyRevenue()).resolves.toMatchObject({
      amount: 3 * 2900 + 2 * 9900,
      currency: 'EUR',
      estimated: true,
    });
  });

  /**
   * Une entreprise supprimée est un client parti, une entreprise bloquée n'a
   * plus accès au service : les compter gonflerait le revenu d'un chiffre que
   * personne ne paie.
   */
  test('excludes deleted and blocked tenants at the SQL level', async () => {
    sequelize.query.mockResolvedValue([]);

    await service.getMonthlyRevenue();

    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('is_active = true');
  });

  test('a free plan contributes nothing', async () => {
    sequelize.query.mockResolvedValue([{ plan: 'free', tenants: '10' }]);

    await expect(service.getMonthlyRevenue()).resolves.toMatchObject({ amount: 0 });
  });

  test('returns zero when no tenant is active', async () => {
    sequelize.query.mockResolvedValue([]);

    await expect(service.getMonthlyRevenue()).resolves.toMatchObject({
      amount: 0, breakdown: [],
    });
  });

  test('breaks the revenue down per plan, biggest first', async () => {
    sequelize.query.mockResolvedValue([
      { plan: 'basic', tenants: '1' },
      { plan: 'pro', tenants: '2' },
    ]);

    const { breakdown } = await service.getMonthlyRevenue();

    expect(breakdown.map(item => item.plan)).toEqual(['pro', 'basic']);
    expect(breakdown[0]).toMatchObject({ label: 'Pro', tenants: 2, total: 19800 });
  });

  // Un forfait absent du référentiel ne doit pas faire planter le calcul.
  test('tolerates a tenant on a plan that no longer exists', async () => {
    sequelize.query.mockResolvedValue([{ plan: 'legacy', tenants: '4' }]);

    await expect(service.getMonthlyRevenue()).resolves.toMatchObject({ amount: 0 });
  });
});
