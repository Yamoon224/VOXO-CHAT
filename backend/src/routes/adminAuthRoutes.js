const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const adminAuthController = require('../controllers/adminAuthController');
const adminAccountController = require('../controllers/adminAccountController');
const {
  adminLoginSchema,
  adminRefreshTokenSchema,
  acceptAdminInvitationSchema,
  updateAdminLocaleSchema,
} = require('../validators/adminValidators');

const router = express.Router();

// Surface d'attaque privilégiée : la limite est plus stricte que côté tenant.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
});

router.post('/login', loginLimiter, validate(adminLoginSchema), adminAuthController.login);
router.post('/refresh-token', validate(adminRefreshTokenSchema), adminAuthController.refreshToken);
router.post(
  '/invitations/accept',
  loginLimiter,
  validate(acceptAdminInvitationSchema),
  adminAccountController.acceptInvitation
);

router.get('/profile', authenticateAdmin, adminAuthController.getProfile);
router.patch('/profile/locale', authenticateAdmin, validate(updateAdminLocaleSchema), adminAuthController.updateLocale);
router.post('/logout', authenticateAdmin, adminAuthController.logout);

module.exports = router;
