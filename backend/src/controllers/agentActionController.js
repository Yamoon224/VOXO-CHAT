const agentActionService = require('../services/agentActionService');
const agentToolExecutorService = require('../services/agentToolExecutorService');
const { successResponse } = require('../utils/responseUtils');
const agentUsageService = require('../services/agentUsageService');
const chatbotSettingsService = require('../services/chatbotSettingsService');

async function list(req, res, next) {
  try {
    return successResponse(res, { actions: await agentActionService.list(req.tenant.id) }, 'Actions agent récupérées');
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  try {
    const action = await agentActionService.create(req.tenant.id, req.body);
    return successResponse(res, { action }, 'Action agent créée', 201);
  } catch (error) { return next(error); }
}

async function update(req, res, next) {
  try {
    const action = await agentActionService.update(req.tenant.id, req.params.id, req.body);
    return successResponse(res, { action }, 'Action agent mise à jour');
  } catch (error) { return next(error); }
}

async function remove(req, res, next) {
  try {
    await agentActionService.remove(req.tenant.id, req.params.id);
    return successResponse(res, {}, 'Action agent supprimée');
  } catch (error) { return next(error); }
}

async function test(req, res, next) {
  try {
    const action = await agentActionService.findOwned(req.tenant.id, req.params.id);
    const result = await agentToolExecutorService.execute(action, req.body?.arguments || {});
    return successResponse(res, { result }, 'Action agent testée');
  } catch (error) { return next(error); }
}

async function usage(req, res, next) {
  try {
    return successResponse(res, await agentUsageService.report(req.tenant.id, req.query), 'Consommation agentique récupérée');
  } catch (error) { return next(error); }
}

async function updateSettings(req, res, next) {
  try {
    const result = await chatbotSettingsService.update(req.tenant, {
      options: { features: { agentActions: Boolean(req.body?.enabled) } },
    });
    return successResponse(res, result, 'Mode agentique mis à jour');
  } catch (error) { return next(error); }
}

module.exports = { list, create, update, remove, test, usage, updateSettings };
