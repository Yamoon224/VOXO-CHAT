const tenantService = require('../services/adminTenantService');
const tenantStatusService = require('../services/adminTenantStatusService');
const { successResponse } = require('../utils/responseUtils');

const listTenants = async (req, res, next) => {
  try {
    const data = await tenantService.listTenants(req.validatedQuery);
    successResponse(res, data, 'Entreprises récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

const getTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantDetail(req.validatedParams.id);
    successResponse(res, tenant, 'Entreprise récupérée avec succès');
  } catch (error) {
    next(error);
  }
};

const updateTenantStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const tenant = await tenantStatusService.setStatus({
      tenantId: req.validatedParams.id,
      isActive,
    });
    successResponse(
      res,
      tenant,
      isActive ? 'Entreprise débloquée avec succès' : 'Entreprise bloquée avec succès'
    );
  } catch (error) {
    next(error);
  }
};

const updateTenantPlan = async (req, res, next) => {
  try {
    const tenant = await tenantStatusService.updatePlan({
      tenantId: req.validatedParams.id,
      subscriptionPlan: req.body.subscriptionPlan,
      subscriptionExpiresAt: req.body.subscriptionExpiresAt,
    });
    successResponse(res, tenant, 'Forfait mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

module.exports = { listTenants, getTenant, updateTenantStatus, updateTenantPlan };
