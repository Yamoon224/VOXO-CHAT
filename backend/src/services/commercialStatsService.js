const { sequelize } = require('../models');

const number = value => Number.parseInt(value, 10) || 0;

class CommercialStatsService {
  async getDashboard({ tenantId, from, to }) {
    const [totals] = await sequelize.query(`
      SELECT COUNT(*) AS created, COUNT(*) FILTER (WHERE outcome_status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE outcome_status IN ('successful','failed','cancelled')) AS resolved,
        COUNT(*) FILTER (WHERE outcome_status = 'successful') AS successful,
        COUNT(*) FILTER (WHERE outcome_status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE outcome_status = 'cancelled') AS cancelled,
        COALESCE(SUM(amount) FILTER (WHERE category = 'order' AND outcome_status = 'successful'), 0) AS successful_amount
      FROM commercial_requests WHERE tenant_id = :tenantId AND created_at >= :from AND created_at < :to`, { replacements: { tenantId, from, to }, type: sequelize.QueryTypes.SELECT });
    const byCategory = await sequelize.query(`SELECT category, COUNT(*) AS created, COUNT(*) FILTER (WHERE outcome_status = 'successful') AS successful FROM commercial_requests WHERE tenant_id = :tenantId AND created_at >= :from AND created_at < :to GROUP BY category`, { replacements: { tenantId, from, to }, type: sequelize.QueryTypes.SELECT });
    const resolved = number(totals.resolved);
    return { created: number(totals.created), inProgress: number(totals.in_progress), resolved, successful: number(totals.successful), failed: number(totals.failed), cancelled: number(totals.cancelled), successRate: resolved ? Math.round((number(totals.successful) / resolved) * 1000) / 10 : null, successfulOrderAmount: number(totals.successful_amount), byCategory: byCategory.map(row => ({ category: row.category, created: number(row.created), successful: number(row.successful) })) };
  }
}
module.exports = new CommercialStatsService();
