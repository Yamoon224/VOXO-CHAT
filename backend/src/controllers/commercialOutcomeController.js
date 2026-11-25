const commercialOutcomeService = require('../services/commercialOutcomeService');
const { successResponse } = require('../utils/responseUtils');

async function update(req, res, next) { try { const request = await commercialOutcomeService.update({ tenantId: req.tenant.id, requestId: req.params.requestId, payload: req.body }); successResponse(res, request, 'Demande commerciale mise à jour avec succès'); } catch (error) { next(error); } }
module.exports = { update };
