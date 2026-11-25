// src/routes/accountDeletionRoutes.js
// Suppression de son propre compte, tous rôles confondus. Monté sur /api/auth :
// l'action est utilisateur, pas tenant — `req.user.tenantId` suffit.
const express = require('express');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { deleteAccountSchema } = require('../validators/accountValidators');
const {
  getDeletionPreview,
  deleteAccount,
} = require('../controllers/accountDeletionController');

const router = express.Router();

// Action irréversible testant un mot de passe : quota strict contre le forçage.
const deletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives. Réessayez dans 1 heure.' },
});

router.get('/account/deletion-preview', authenticate, getDeletionPreview);

router.delete('/account',
  authenticate,
  deletionLimiter,
  validate(deleteAccountSchema),
  deleteAccount
);

module.exports = router;
