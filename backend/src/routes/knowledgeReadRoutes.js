// Consultation de la base de connaissances : tout ce qui ne modifie rien.
// Exige `knowledge:read` ; un membre en écriture le satisfait d'office.
const express = require('express');

const {
  getKnowledgeBase,
  getKnowledgeItem,
  searchKnowledge,
  getKnowledgeStats,
  getCrawlJob,
  listCrawlJobs,
  getProcessingCapabilities,
  getProcessingHealth,
} = require('../controllers/knowledgeController');
const {
  getProcessingHistory,
  exportKnowledgeAsJson,
  getOriginalFileUrl,
} = require('../controllers/knowledgeLifecycleController');

const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { knowledgeValidators } = require('../validators/knowledgeValidators');

const router = express.Router();

const canRead = [authenticate, requirePermission('knowledge', 'read')];

// ATTENTION À L'ORDRE : toutes les routes à segment littéral doivent être
// déclarées avant `/:id`, qui capturerait sinon « stats », « search », etc.

router.get('/processing/capabilities', canRead, getProcessingCapabilities);

router.get('/processing/health', canRead, getProcessingHealth);

router.get('/stats', canRead, getKnowledgeStats);

/**
 * @swagger
 * /api/knowledge/search:
 *   get:
 *     summary: Rechercher dans la base de connaissances
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résultats de la recherche
 */
router.get('/search',
  canRead,
  validate(knowledgeValidators.searchKnowledgeSchema),
  searchKnowledge
);

router.get('/crawl-jobs', canRead, listCrawlJobs);

router.get('/crawl-jobs/:id', canRead, getCrawlJob);

router.get('/export/json', canRead, exportKnowledgeAsJson);

/**
 * @swagger
 * /api/knowledge:
 *   get:
 *     summary: Lister la base de connaissances
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des connaissances récupérée
 */
router.get('/',
  canRead,
  validate(knowledgeValidators.getKnowledgeBaseSchema),
  getKnowledgeBase
);

router.get('/:id/processing-history', canRead, getProcessingHistory);

// URL signée de courte durée vers le fichier d'origine conservé
router.get('/:id/file', canRead, getOriginalFileUrl);

// Doit rester la dernière route GET déclarée.
router.get('/:id', canRead, getKnowledgeItem);

module.exports = router;
