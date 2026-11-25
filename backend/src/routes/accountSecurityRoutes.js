// src/routes/accountSecurityRoutes.js
// Routes publiques de sécurité du compte : réinitialisation de mot de passe
// et vérification d'adresse email. Monté sur le même préfixe /api/auth.
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  forgotPassword,
  resetPassword,
} = require('../controllers/passwordController');

const {
  verifyEmail,
  resendVerification,
} = require('../controllers/emailVerificationController');

const { validate } = require('../middleware/validationMiddleware');

const {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require('../validators/authValidators');

const router = express.Router();

// Émission d'un lien par email : quota strict pour éviter l'usage en spam relay
const emailLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 demandes max par IP par heure
  message: {
    error: 'Trop de demandes. Veuillez réessayer dans 1 heure.',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Consommation d'un lien reçu : quota plus large, l'utilisateur est légitime
const tokenConsumptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max par IP
  message: {
    error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Demander une réinitialisation de mot de passe
router.post('/forgot-password',
  emailLinkLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

// Réinitialiser le mot de passe via le lien reçu
router.post('/reset-password',
  tokenConsumptionLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

// Confirmer l'adresse email via le lien reçu
router.post('/verify-email',
  tokenConsumptionLimiter,
  validate(verifyEmailSchema),
  verifyEmail
);

// Renvoyer le lien de vérification
router.post('/resend-verification',
  emailLinkLimiter,
  validate(resendVerificationSchema),
  resendVerification
);

module.exports = router;
