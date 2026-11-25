const express = require('express');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { requireAssignedSupportTicket } = require('../middleware/assignedSupportTicketMiddleware');
const { validate, validateParams, validateQuery } = require('../middleware/validationMiddleware');
const { statsPeriodSchema } = require('../validators/statsValidators');
const adminSupportController = require('../controllers/adminSupportController');
const adminPlanChangeController = require('../controllers/adminPlanChangeController');
const {
  adminReplySchema,
  listTicketsSchema,
  updateStatusSchema,
  assignTicketSchema,
  supportResourceParamsSchema,
  approvePlanChangeSchema,
} = require('../validators/supportValidators');

const router = express.Router();

router.use(authenticateAdmin);

const canRead = requireAdminPermission('support', 'read');
const canWrite = requireAdminPermission('support', 'write');

router.get('/', canRead, validateQuery(listTicketsSchema), adminSupportController.listTickets);
router.get('/count', canRead, adminSupportController.countOpenTickets);
router.get('/stats', canRead, validateQuery(statsPeriodSchema), adminSupportController.getStats);
router.get(
  '/:id',
  canRead,
  validateParams(supportResourceParamsSchema),
  requireAssignedSupportTicket,
  adminSupportController.getTicket
);

router.patch(
  '/:id/assignment',
  canWrite,
  validateParams(supportResourceParamsSchema),
  validate(assignTicketSchema),
  adminSupportController.assignTicket
);
router.post(
  '/:id/approve-plan-change',
  canWrite,
  requireAdminPermission('tenants', 'write'),
  validateParams(supportResourceParamsSchema),
  requireAssignedSupportTicket,
  validate(approvePlanChangeSchema),
  adminPlanChangeController.approve
);
router.delete(
  '/:id/assignment',
  canWrite,
  validateParams(supportResourceParamsSchema),
  requireAssignedSupportTicket,
  adminSupportController.releaseTicket
);
router.patch(
  '/:id/status',
  canWrite,
  validateParams(supportResourceParamsSchema),
  requireAssignedSupportTicket,
  validate(updateStatusSchema),
  adminSupportController.updateStatus
);
// `internal: true` dans le corps produit une note interne, jamais visible du
// client. Aucune route tenant n'accepte ce champ.
router.post(
  '/:id/messages',
  canWrite,
  validateParams(supportResourceParamsSchema),
  requireAssignedSupportTicket,
  validate(adminReplySchema),
  adminSupportController.reply
);

module.exports = router;
