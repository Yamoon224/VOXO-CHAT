const planService = require('../services/planService');
const { successResponse } = require('../utils/responseUtils');

async function listPlans(req, res, next) {
  try {
    const plans = await planService.listPlans();
    const publicPlans = plans.map(({ name, label, prices, messagesPerMonth, activeDocuments, features, billingInterval }) => ({ name, label, prices, messagesPerMonth, activeDocuments, features, billingInterval }));
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    successResponse(res, { plans: publicPlans }, 'Forfaits publics récupérés avec succès');
  } catch (error) { next(error); }
}

module.exports = { listPlans };
