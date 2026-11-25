const express = require('express');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { validate, validateParams } = require('../middleware/validationMiddleware');
const adminPlanController = require('../controllers/adminPlanController');
const { updatePlanSchema, createPlanSchema, adminResourceParamsSchema } = require('../validators/adminValidators');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requireAdminPermission('plans', 'read'), adminPlanController.listPlans);

router.post('/', requireAdminPermission('plans', 'write'), validate(createPlanSchema), adminPlanController.createPlan);
router.patch(
  '/:id',
  requireAdminPermission('plans', 'write'),
  validateParams(adminResourceParamsSchema),
  validate(updatePlanSchema),
  adminPlanController.updatePlan
);
router.delete('/:id', requireAdminPermission('plans', 'write'), validateParams(adminResourceParamsSchema), adminPlanController.archivePlan);

module.exports = router;
