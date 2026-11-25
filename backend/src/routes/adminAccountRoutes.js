const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { validate, validateParams, validateQuery } = require('../middleware/validationMiddleware');
const adminAccountController = require('../controllers/adminAccountController');
const {
  inviteAdminSchema,
  updateAdminRoleSchema,
  updateAdminStatusSchema,
  listAdminsSchema,
  adminResourceParamsSchema,
} = require('../validators/adminValidators');

const router = express.Router();

const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives d’invitation. Réessayez plus tard.' },
});

router.use(authenticateAdmin);

router.get(
  '/',
  requireAdminPermission('admins', 'read'),
  validateQuery(listAdminsSchema),
  adminAccountController.listAdmins
);

router.post(
  '/invitations',
  requireAdminPermission('admins', 'write'),
  invitationLimiter,
  validate(inviteAdminSchema),
  adminAccountController.inviteAdmin
);
router.post(
  '/invitations/:id/resend',
  requireAdminPermission('admins', 'write'),
  invitationLimiter,
  validateParams(adminResourceParamsSchema),
  adminAccountController.resendInvitation
);
router.delete(
  '/invitations/:id',
  requireAdminPermission('admins', 'write'),
  validateParams(adminResourceParamsSchema),
  adminAccountController.revokeInvitation
);

router.patch(
  '/:id/role',
  requireAdminPermission('admins', 'write'),
  validateParams(adminResourceParamsSchema),
  validate(updateAdminRoleSchema),
  adminAccountController.updateAdminRole
);
router.patch(
  '/:id/status',
  requireAdminPermission('admins', 'write'),
  validateParams(adminResourceParamsSchema),
  validate(updateAdminStatusSchema),
  adminAccountController.updateAdminStatus
);

module.exports = router;
