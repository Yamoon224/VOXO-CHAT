const planService = require('../services/planService');
const planChangeRequestService = require('../services/planChangeRequestService');
const { successResponse } = require('../utils/responseUtils');

const getPlans = async (req, res, next) => {
  try {
    const currency = req.tenant?.settings?.billing?.currency || 'EUR';
    successResponse(res, { plans: await planService.listPlans(), currency }, 'Forfaits récupérés avec succès');
  } catch (error) { next(error); }
};

const updateCurrency = async (req, res, next) => {
  try {
    const settings = { ...(req.tenant.settings || {}), billing: { ...(req.tenant.settings?.billing || {}), currency: req.body.currency } };
    await req.tenant.update({ settings });
    successResponse(res, { currency: req.body.currency }, 'Devise de facturation mise à jour');
  } catch (error) { next(error); }
};

const createPlanChangeRequest = async (req, res, next) => {
  try {
    const ticket = await planChangeRequestService.create({ tenant: req.tenant, actor: req.user, ...req.body });
    successResponse(res, { ticketId: ticket.id }, 'Demande de changement de forfait envoyée', 201);
  } catch (error) { next(error); }
};

module.exports = { getPlans, updateCurrency, createPlanChangeRequest };
