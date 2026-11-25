const service = require('./billingCycleService');

describe('billingCycleService', () => {
  test('keeps month-end monthly billing on the last day available', () => {
    expect(service.calculateMonthlyExpiry('2026-01-31T12:00:00.000Z').toISOString()).toBe('2026-02-28T12:00:00.000Z');
  });

  test('uses a seven-day grace period before expiry', () => {
    const expiresAt = new Date('2026-08-01T00:00:00.000Z');
    expect(service.getStatus(expiresAt, new Date('2026-08-05T00:00:00.000Z'))).toBe('grace');
    expect(service.getStatus(expiresAt, new Date('2026-08-09T00:00:00.000Z'))).toBe('expired');
  });

  test('downgrades only an expired paid tenant', async () => {
    const tenant = { subscriptionPlan: 'pro', subscriptionExpiresAt: '2026-08-01T00:00:00.000Z', update: jest.fn() };
    await expect(service.downgradeIfExpired(tenant, new Date('2026-08-09T00:00:00.000Z'))).resolves.toBe(true);
    expect(tenant.update).toHaveBeenCalledWith({ subscriptionPlan: 'free', subscriptionExpiresAt: null });
  });
});
