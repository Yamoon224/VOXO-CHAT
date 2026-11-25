// src/controllers/analyticsController.js
const { successResponse, errorResponse } = require('../utils/responseUtils');
const tenantStatsService = require('../services/tenantStatsService');
const { buildWindow } = require('../services/statsWindow');
const commercialStatsService = require('../services/commercialStatsService');

/**
 * Statistiques du tableau de bord, bornées par une période.
 *
 * Tout le SQL vit dans `tenantStatsService`, qui porte le filtre `tenantId` sur
 * chacune de ses requêtes et dont les tests le verrouillent. Le contrôleur ne
 * fait plus que traduire une période en fenêtre.
 *
 * `period` est validé en amont par `statsValidators` : `req.validatedQuery` est
 * donc toujours renseigné, avec `30d` par défaut.
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { period } = req.validatedQuery;
    const { from, to, days } = buildWindow(period);
    const tenantId = req.tenant.id;

    const [stats, trend, commercial] = await Promise.all([
      tenantStatsService.getDashboard({ tenantId, from, to }),
      tenantStatsService.getConversationTrend({ tenantId, from, to }),
      commercialStatsService.getDashboard({ tenantId, from, to }),
    ]);

    successResponse(res, {
      stats: { ...stats, commercial, trend, period, days },
      message: 'Statistiques du tableau de bord récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    errorResponse(res, 'Erreur lors du calcul des statistiques', 500);
  }
};

/**
 * Récupérer des statistiques détaillées (bouchonné pour le moment)
 */
exports.getDetailedStats = async (req, res) => {
  try {
    successResponse(res, { message: 'Detailed analytics - Coming soon' });
  } catch (error) {
    console.error('Erreur analytics détaillées:', error);
    errorResponse(res, 'Erreur lors de la récupération des données', 500);
  }
};
