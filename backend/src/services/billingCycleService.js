const { AppError } = require('../middleware/errorMiddleware');

const GRACE_PERIOD_DAYS = 7;

function addOneMonth(date) {
  const start = new Date(date);
  const targetMonth = start.getUTCMonth() + 1;
  const endOfTarget = new Date(Date.UTC(start.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(start.getUTCFullYear(), targetMonth, Math.min(start.getUTCDate(), endOfTarget),
    start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

class BillingCycleService {
  calculateMonthlyExpiry(startAt) {
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) throw new AppError('Date de paiement invalide', 400, { code: 'BILLING_DATE_INVALID' });
    return addOneMonth(start);
  }

  getGraceEndsAt(expiresAt) {
    return addDays(expiresAt, GRACE_PERIOD_DAYS);
  }

  getStatus(expiresAt, now = new Date()) {
    if (!expiresAt) return 'active';
    if (now <= new Date(expiresAt)) return 'active';
    return now <= this.getGraceEndsAt(expiresAt) ? 'grace' : 'expired';
  }

  async downgradeIfExpired(tenant, now = new Date()) {
    if (tenant.subscriptionPlan === 'free' || this.getStatus(tenant.subscriptionExpiresAt, now) !== 'expired') return false;
    await tenant.update({ subscriptionPlan: 'free', subscriptionExpiresAt: null });
    return true;
  }
}

module.exports = new BillingCycleService();
module.exports.GRACE_PERIOD_DAYS = GRACE_PERIOD_DAYS;
