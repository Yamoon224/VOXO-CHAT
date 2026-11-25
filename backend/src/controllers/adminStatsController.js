const platformStatsService = require('../services/platformStatsService');
const platformRevenueService = require('../services/platformRevenueService');
const platformPaymentStatsService = require('../services/platformPaymentStatsService');
const { successResponse } = require('../utils/responseUtils');

/**
 * Tableau de bord de la plateforme. Un seul appel sert toutes les tuiles et
 * tous les graphiques : les agrégats partagent la même fenêtre temporelle, les
 * répartir sur plusieurs endpoints exposerait à des chiffres incohérents entre
 * eux si la période changeait entre deux requêtes.
 */
const getStats = async (req, res, next) => {
  try {
    const { period } = req.validatedQuery;
    const window = platformStatsService.buildWindow(period);

    const [accounts, activeChatbots, conversations, satisfaction, trend, revenue, payments] = await Promise.all([
      platformStatsService.getAccountTotals(),
      platformStatsService.getActiveChatbots(window),
      platformStatsService.getConversationTotals(window),
      platformStatsService.getSatisfaction(window),
      platformStatsService.getConversationTrend(window),
      platformRevenueService.getMonthlyRevenue(),
      platformPaymentStatsService.getPaidPayments(window),
    ]);

    successResponse(res, {
      period,
      from: window.from,
      to: window.to,
      accounts,
      activeChatbots,
      conversations,
      satisfaction,
      revenue,
      payments,
      trend,
    }, 'Statistiques récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
