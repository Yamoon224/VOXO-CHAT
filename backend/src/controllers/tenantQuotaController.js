const quotaService = require('../services/quotaService');
const planService = require('../services/planService');
const { successResponse } = require('../utils/responseUtils');

/**
 * Consommation et limites réelles de l'entreprise connectée.
 *
 * Seule source autorisée pour afficher un quota côté client : les valeurs
 * étaient auparavant écrites en dur dans l'interface et ne correspondaient pas
 * à ce que le backend appliquait réellement.
 */
const getQuota = async (req, res, next) => {
  try {
    const status = await quotaService.getQuotaStatus(req.tenant);
    // `status.plan` est le forfait EFFECTIF : il tient compte d'une échéance
    // dépassée, contrairement à la colonne du tenant.
    const plan = await planService.getPlan(status.plan);

    successResponse(res, {
      ...status,
      planLabel: plan.label,
      priceAmount: plan.priceAmount,
      priceCurrency: plan.priceCurrency,
      prices: plan.prices,
      // Les compteurs journaliers se réinitialisent à minuit UTC, comme le mensuel.
      resetsAt: 'UTC',
    }, 'Consommation récupérée');
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuota };
