const express = require('express');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validationMiddleware');
const { acceptInvitationSchema } = require('../validators/teamValidators');
const { acceptInvitation } = require('../controllers/invitationController');

const router = express.Router();
const acceptanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives. Réessayez plus tard.' },
});

router.post('/invitations/accept', acceptanceLimiter, validate(acceptInvitationSchema), acceptInvitation);

module.exports = router;
