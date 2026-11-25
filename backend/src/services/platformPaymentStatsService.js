const { sequelize } = require('../models');

const toNumber = value => Number(value) || 0;

class PlatformPaymentStatsService {
  /** Paiements effectivement encaissés dans la fenêtre [from, to[, sans conversion monétaire. */
  async getPaidPayments({ from, to }) {
    const rows = await sequelize.query(`
      SELECT currency, COUNT(*) AS payments, COALESCE(SUM(amount), 0) AS amount
        FROM payment_transactions
       WHERE status = 'paid'
         AND paid_at IS NOT NULL
         AND paid_at >= :from AND paid_at < :to
       GROUP BY currency
    `, {
      replacements: { from, to },
      type: sequelize.QueryTypes.SELECT,
    });

    const totalPayments = rows.reduce((total, row) => total + toNumber(row.payments), 0);
    const byCurrency = rows.map(row => ({
      currency: row.currency,
      payments: toNumber(row.payments),
      amount: toNumber(row.amount),
    })).sort((left, right) => (
      right.payments - left.payments || right.amount - left.amount || left.currency.localeCompare(right.currency)
    )).map(item => ({
      ...item,
      percentage: totalPayments ? Number(((item.payments / totalPayments) * 100).toFixed(1)) : 0,
    }));

    return {
      totalPayments,
      byCurrency,
      dominantCurrency: byCurrency[0] || null,
    };
  }
}

module.exports = new PlatformPaymentStatsService();
