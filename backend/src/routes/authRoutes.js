// src/routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
} = require('../controllers/authController');

// Les routes publiques de réinitialisation et de vérification vivent dans
// accountSecurityRoutes.js, monté sur le même préfixe /api/auth.
const { changePassword } = require('../controllers/passwordController');

const { authenticate } = require('../middleware/authMiddleware');
const { uploadKnowledgeFile } = require('../middleware/uploadMiddleware');
const brandingMediaController = require('../controllers/brandingMediaController');
const { validate } = require('../middleware/validationMiddleware');

const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validators/authValidators');

const router = express.Router();

// Rate limiting pour les routes sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max par IP
  message: {
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Les tentatives en échec comptent aussi : les exclure (`skipFailedRequests`)
// ouvrirait une énumération d'adresses sans limite. Le quota est donc assez
// large pour ne pas enfermer un utilisateur qui bute sur un conflit.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 tentatives max par IP par heure
  message: {
    error: 'Trop d\'inscriptions depuis cette IP. Veuillez réessayer dans 1 heure.',
    retryAfter: 60 * 60,
  },
});


// ===== ROUTES PUBLIQUES =====

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur (Propriétaire)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirmPassword
 *               - firstName
 *               - lastName
 *               - companyName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               companyName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Requête invalide
 */
router.post('/register',
  registerLimiter,
  validate(registerSchema),
  register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne les tokens
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login',
  authLimiter,
  validate(loginSchema),
  login
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Rafraîchir le token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau token généré
 */
router.post('/refresh-token',
  validate(refreshTokenSchema),
  refreshToken
);

// ===== ROUTES PROTÉGÉES =====

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtenir le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *       401:
 *         description: Non authentifié
 */
router.get('/profile',
  authenticate,
  getProfile
);

// Mettre à jour le profil
router.put('/profile',
  authenticate,
  validate(updateProfileSchema),
  updateProfile
);
router.post('/profile/avatar', authenticate, uploadKnowledgeFile, brandingMediaController.uploadProfileAvatar);

// Changer le mot de passe
router.put('/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

// Déconnexion
router.post('/logout',
  authenticate,
  logout
);

// ===== ROUTES DE TEST (à supprimer en production) =====
if (process.env.NODE_ENV === 'development') {
  const { successResponse } = require('../utils/responseUtils');

  router.get('/test', (req, res) => {
    successResponse(res, { message: 'Routes d\'authentification fonctionnelles!' });
  });
}

module.exports = router;
