const priorityService = require('../services/conversationPriorityService');
const labelService = require('../services/conversationLabelService');
const { successResponse } = require('../utils/responseUtils');

async function updatePriority(req, res, next) {
  try {
    const priority = await priorityService.updateManual(req.tenant.id, req.params.sessionId, req.body.value);
    return successResponse(res, { priority }, 'Priorité mise à jour');
  } catch (error) { return next(error); }
}

async function listLabels(req, res, next) {
  try { return successResponse(res, { labels: await labelService.list(req.tenant.id) }, 'Étiquettes récupérées'); }
  catch (error) { return next(error); }
}

async function createLabel(req, res, next) {
  try {
    const label = await labelService.create(req.tenant.id, req.user.id, req.body);
    return successResponse(res, { label }, 'Étiquette créée', 201);
  } catch (error) { return next(error); }
}

async function updateLabel(req, res, next) {
  try {
    const label = await labelService.update(req.tenant.id, req.params.labelId, req.body);
    return successResponse(res, { label }, 'Étiquette mise à jour');
  } catch (error) { return next(error); }
}

async function deleteLabel(req, res, next) {
  try {
    await labelService.remove(req.tenant.id, req.params.labelId);
    return successResponse(res, {}, 'Étiquette supprimée');
  } catch (error) { return next(error); }
}

async function assignLabels(req, res, next) {
  try {
    const labels = await labelService.assign(req.tenant.id, req.params.sessionId, req.body.labelIds);
    return successResponse(res, { labels }, 'Étiquettes mises à jour');
  } catch (error) { return next(error); }
}

module.exports = { updatePriority, listLabels, createLabel, updateLabel, deleteLabel, assignLabels };
