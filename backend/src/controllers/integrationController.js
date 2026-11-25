const { successResponse } = require('../utils/responseUtils');
const service = require('../services/integrationConnectorService');
const microsoftOAuthService = require('../services/microsoftOAuthService');

async function list(req, res, next) { try { successResponse(res, await service.list(req.tenant.id), 'Intégrations récupérées'); } catch (error) { next(error); } }
async function save(req, res, next) { try { successResponse(res, await service.save(req.tenant, req.body), 'Intégration enregistrée'); } catch (error) { next(error); } }
async function sync(req, res, next) { try { successResponse(res, await service.sync(req.tenant, req.params.id), 'Synchronisation terminée'); } catch (error) { next(error); } }
async function disconnect(req, res, next) { try { successResponse(res, await service.disconnect(req.tenant.id, req.params.id), 'Intégration déconnectée'); } catch (error) { next(error); } }
async function jobs(req, res, next) { try { successResponse(res, await service.jobs(req.tenant.id, req.params.id), 'Historique récupéré'); } catch (error) { next(error); } }
async function startMicrosoft(req, res, next) { try { successResponse(res, await microsoftOAuthService.start(req.tenant.id, req.body.drives || [], req.body.syncFrequency), 'Redirection Microsoft prête'); } catch (error) { next(error); } }
async function completeMicrosoft(req, res, next) { try { await microsoftOAuthService.complete(req.query.code, req.query.state); res.redirect(`${require('../config/config').app.frontendUrl}/dashboard/integration?microsoft=connected`); } catch (error) { next(error); } }

module.exports = { list, save, sync, disconnect, jobs, startMicrosoft, completeMicrosoft };
