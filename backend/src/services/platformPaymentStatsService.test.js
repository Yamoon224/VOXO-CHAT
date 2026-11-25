jest.mock('../models', () => ({
  sequelize: { query: jest.fn(), QueryTypes: { SELECT: 'SELECT' } },
}));

const { sequelize } = require('../models');
const service = require('./platformPaymentStatsService');

describe('platformPaymentStatsService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('groups paid payments by currency and ranks the most-used one', async () => {
    sequelize.query.mockResolvedValue([
      { currency: 'EUR', payments: '2', amount: '6500' },
      { currency: 'XOF', payments: '3', amount: '450000' },
    ]);

    await expect(service.getPaidPayments({ from: '2026-08-01', to: '2026-09-01' })).resolves.toEqual({
      totalPayments: 5,
      byCurrency: [
        { currency: 'XOF', payments: 3, amount: 450000, percentage: 60 },
        { currency: 'EUR', payments: 2, amount: 6500, percentage: 40 },
      ],
      dominantCurrency: { currency: 'XOF', payments: 3, amount: 450000, percentage: 60 },
    });
  });

  test('uses amount then currency as deterministic ranking tiebreakers', async () => {
    sequelize.query.mockResolvedValue([
      { currency: 'USD', payments: '2', amount: '1000' },
      { currency: 'EUR', payments: '2', amount: '2000' },
    ]);
    const stats = await service.getPaidPayments({ from: 'a', to: 'b' });
    expect(stats.dominantCurrency.currency).toBe('EUR');
  });

  test('returns an explicit empty result and only queries paid transactions in the window', async () => {
    sequelize.query.mockResolvedValue([]);
    await expect(service.getPaidPayments({ from: 'a', to: 'b' })).resolves.toEqual({ totalPayments: 0, byCurrency: [], dominantCurrency: null });
    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).toContain("status = 'paid'");
    expect(sql).toContain('paid_at >= :from AND paid_at < :to');
    expect(options.replacements).toEqual({ from: 'a', to: 'b' });
  });
});
