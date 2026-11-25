const express = require('express');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireAdminPermission } = require('../middleware/adminPermissionMiddleware');
const { validateQuery } = require('../middleware/validationMiddleware');
const adminStatsController = require('../controllers/adminStatsController');
const { statsPeriodSchema } = require('../validators/statsValidators');

const router = express.Router();

router.use(authenticateAdmin);

// Lecture seule : ce module n'expose aucune écriture. La ressource `stats` est
// distincte de `tenants` parce qu'elle expose le revenu de la plateforme, et
// doit pouvoir être accordée séparément.
router.get(
  '/',
  requireAdminPermission('stats', 'read'),
  validateQuery(statsPeriodSchema),
  adminStatsController.getStats
);

module.exports = router;
