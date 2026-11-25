const express = require('express');
const Joi = require('joi');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { validate, validateParams, validateQuery } = require('../middleware/validationMiddleware');
const adminTenantController = require('../controllers/adminTenantController');
const creditController = require('../controllers/creditController');
const {
  listTenantsSchema,
  updateTenantStatusSchema,
  updateTenantPlanSchema,
  adminResourceParamsSchema,
} = require('../validators/adminValidators');

const router = express.Router();

router.use(authenticateAdmin);

router.get(
  '/',
  requireAdminPermission('tenants', 'read'),
  validateQuery(listTenantsSchema),
  adminTenantController.listTenants
);
router.get(
  '/:id',
  requireAdminPermission('tenants', 'read'),
  validateParams(adminResourceParamsSchema),
  adminTenantController.getTenant
);

router.patch(
  '/:id/status',
  requireAdminPermission('tenants', 'write'),
  validateParams(adminResourceParamsSchema),
  validate(updateTenantStatusSchema),
  adminTenantController.updateTenantStatus
);
router.get('/:id/credits', requireAdminPermission('tenants', 'read'), validateParams(adminResourceParamsSchema), creditController.getAdminWallet);
router.post('/:id/credits', requireAdminPermission('tenants', 'write'), validateParams(adminResourceParamsSchema), validate(Joi.object({ amount: Joi.number().integer().invalid(0).required(), note: Joi.string().trim().max(250).allow('') })), creditController.adjustAdminWallet);
router.patch(
  '/:id/plan',
  requireAdminPermission('tenants', 'write'),
  validateParams(adminResourceParamsSchema),
  validate(updateTenantPlanSchema),
  adminTenantController.updateTenantPlan
);

module.exports = router;
