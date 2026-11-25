const { CreditLedger, sequelize } = require('../models');
const planService = require('./planService');
const { AppError } = require('../middleware/errorMiddleware');

const periodKey = (date = new Date()) => date.toISOString().slice(0, 7);

class CreditService {
  async ensureCycleGrant(tenant) {
    const plan = await planService.getPlan(tenant.subscriptionPlan);
    const key = periodKey();
    if (!plan.creditsPerCycle) return;
    await CreditLedger.findOrCreate({ where: { tenantId: tenant.id, type: 'cycle_grant', periodKey: key }, defaults: { tenantId: tenant.id, type: 'cycle_grant', periodKey: key, amount: plan.creditsPerCycle, note: `Crédits ${key}` } });
  }

  async getBalance(tenant) {
    await this.ensureCycleGrant(tenant);
    const [row] = await sequelize.query('SELECT COALESCE(SUM(amount), 0)::int AS balance FROM credit_ledger WHERE tenant_id = :tenantId AND (period_key IS NULL OR period_key = :periodKey)', { replacements: { tenantId: tenant.id, periodKey: periodKey() }, type: sequelize.QueryTypes.SELECT });
    return Number(row.balance);
  }

  async getWallet(tenant) {
    const balance = await this.getBalance(tenant);
    const entries = await CreditLedger.findAll({ where: { tenantId: tenant.id }, order: [['createdAt', 'DESC']], limit: 50 });
    return { balance, periodKey: periodKey(), entries };
  }

  async adjust({ tenant, amount, note, adminId }) {
    if (!Number.isInteger(amount) || amount === 0) throw new AppError('Le montant de crédits doit être un entier non nul', 400, { code: 'CREDIT_AMOUNT_INVALID' });
    if (amount < 0 && await this.getBalance(tenant) + amount < 0) throw new AppError('Le solde de crédits ne peut pas devenir négatif', 409, { code: 'CREDIT_BALANCE_NEGATIVE' });
    return CreditLedger.create({ tenantId: tenant.id, amount, type: amount > 0 ? 'manual_grant' : 'manual_debit', note: note?.trim() || null, createdByAdminId: adminId });
  }
}

module.exports = new CreditService();
