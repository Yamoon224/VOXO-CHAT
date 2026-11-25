const adminPlanService = require('../services/adminPlanService');
const { successResponse } = require('../utils/responseUtils');

const listPlans = async (req, res, next) => {
  try {
    const plans = await adminPlanService.listPlans();
    successResponse(res, { plans }, 'Forfaits récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await adminPlanService.updatePlan({
      planId: req.validatedParams.id,
      ...req.body,
    });
    successResponse(res, plan, 'Forfait mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};
const createPlan = async (req, res, next) => { try { successResponse(res, await adminPlanService.createPlan(req.body), 'Forfait créé avec succès', 201); } catch (error) { next(error); } };
const archivePlan = async (req, res, next) => { try { successResponse(res, await adminPlanService.archivePlan(req.validatedParams.id), 'Forfait archivé avec succès'); } catch (error) { next(error); } };

module.exports = { listPlans, updatePlan, createPlan, archivePlan };
