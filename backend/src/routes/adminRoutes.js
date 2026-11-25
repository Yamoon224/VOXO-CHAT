const express = require('express');
const adminAuthRoutes = require('./adminAuthRoutes');
const adminRoleRoutes = require('./adminRoleRoutes');
const adminAccountRoutes = require('./adminAccountRoutes');
const adminTenantRoutes = require('./adminTenantRoutes');
const adminPlanRoutes = require('./adminPlanRoutes');
const adminStatsRoutes = require('./adminStatsRoutes');
const adminSupportRoutes = require('./adminSupportRoutes');

/**
 * Point de montage unique de la plateforme d'administration.
 *
 * Volontairement sans `extractTenantFromRequest` : ces routes sont transverses
 * aux tenants. L'étanchéité vient de `authenticateAdmin`, appliqué dans chaque
 * sous-routeur, qui exige un jeton portant `scope: 'admin'` — qu'aucune session
 * tenant ne possède.
 */
const router = express.Router();

router.use('/auth', adminAuthRoutes);
router.use('/roles', adminRoleRoutes);
router.use('/accounts', adminAccountRoutes);
router.use('/tenants', adminTenantRoutes);
router.use('/plans', adminPlanRoutes);
router.use('/stats', adminStatsRoutes);
router.use('/support', adminSupportRoutes);

module.exports = router;
