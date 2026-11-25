// src/routes/analyticsRoutes.js
const express = require('express');
const { successResponse } = require('../utils/responseUtils');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validateQuery } = require('../middleware/validationMiddleware');
const { statsPeriodSchema } = require('../validators/statsValidators');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// Les statistiques sont des données du tenant : sans authentification, un
// simple en-tête X-Tenant-ID suffisait à lire celles d'un autre client.
const canReadAnalytics = [authenticate, requirePermission('analytics', 'read')];

// Route de test
router.get('/test', (req, res) => {
  successResponse(res, {
    message: 'Analytics routes working!',
    tenant: req.tenant.name
  }, 'Analytics test successful');
});

// Statistiques générales. `validateQuery` renseigne `req.validatedQuery` avec
// `30d` par défaut : le contrôleur n'a aucun repli à gérer.
router.get(
  '/dashboard',
  canReadAnalytics,
  validateQuery(statsPeriodSchema),
  analyticsController.getDashboardStats
);

// Statistiques détaillées
router.get('/detailed', canReadAnalytics, analyticsController.getDetailedStats);

module.exports = router;
