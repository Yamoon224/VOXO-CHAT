const creditService = require('../services/creditService');
const adminTenantService = require('../services/adminTenantService');
const { successResponse } = require('../utils/responseUtils');

async function getTenantWallet(req, res, next) { try { successResponse(res, await creditService.getWallet(req.tenant), 'Portefeuille récupéré avec succès'); } catch (error) { next(error); } }
async function getAdminWallet(req, res, next) { try { const tenant = await adminTenantService.findTenantOrFail(req.validatedParams.id); successResponse(res, await creditService.getWallet(tenant), 'Portefeuille récupéré avec succès'); } catch (error) { next(error); } }
async function adjustAdminWallet(req, res, next) { try { const tenant = await adminTenantService.findTenantOrFail(req.validatedParams.id); const entry = await creditService.adjust({ tenant, ...req.body, adminId: req.adminUser.id }); successResponse(res, entry, 'Crédits ajustés avec succès', 201); } catch (error) { next(error); } }
module.exports = { getTenantWallet, getAdminWallet, adjustAdminWallet };
