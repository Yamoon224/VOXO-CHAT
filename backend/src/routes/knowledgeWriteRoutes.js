// Modification de la base de connaissances : création, mise à jour, suppression.
// Exige `knowledge:write`, quel que soit le rôle du membre.
const express = require('express');

const {
  createKnowledge,
  createKnowledgeFromFile,
  createKnowledgeFromUrl,
  crawlSite,
  reprocessKnowledge,
  updateKnowledge,
  deleteKnowledge,
  bulkImport,
  regenerateEmbeddings,
  previewFileProcessing,
} = require('../controllers/knowledgeController');
const {
  duplicateKnowledge,
  archiveKnowledge,
} = require('../controllers/knowledgeLifecycleController');

const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { uploadKnowledgeFile } = require('../middleware/uploadMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { knowledgeValidators } = require('../validators/knowledgeValidators');
const {
  embeddingLimiter,
  bulkLimiter,
  ocrLimiter,
  urlLimiter,
  crawlLimiter,
  uploadLimiter,
} = require('../config/knowledgeRateLimits');

const router = express.Router();

const canWrite = [authenticate, requirePermission('knowledge', 'write')];

/**
 * @swagger
 * /api/knowledge:
 *   post:
 *     summary: Créer une nouvelle connaissance (manuel)
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Connaissance créée
 */
router.post('/',
  canWrite,
  validate(knowledgeValidators.createKnowledgeSchema),
  createKnowledge
);

// Prévisualiser un fichier avant traitement complet
router.post('/processing/preview', canWrite, ocrLimiter, uploadKnowledgeFile, previewFileProcessing);

// Créer une connaissance à partir d'un fichier (PDF, Word, Excel, texte)
router.post('/upload', canWrite, uploadLimiter, uploadKnowledgeFile, createKnowledgeFromFile);

router.post('/from-url',
  canWrite,
  urlLimiter,
  validate(knowledgeValidators.createFromUrlSchema),
  createKnowledgeFromUrl
);

// Crawl multi-pages d'un site : réponse 202, suivi par polling
router.post('/crawl-site',
  canWrite,
  crawlLimiter,
  validate(knowledgeValidators.crawlSiteSchema),
  crawlSite
);

router.post('/bulk-import',
  canWrite,
  bulkLimiter,
  validate(knowledgeValidators.bulkImportSchema),
  bulkImport
);

router.post('/regenerate-embeddings', canWrite, embeddingLimiter, regenerateEmbeddings);

router.post('/:id/duplicate', canWrite, duplicateKnowledge);

// Retraiter une connaissance : re-scraper la source URL, ou relire le fichier
// d'origine conservé au stockage, puis ré-indexer
router.post('/:id/reprocess', canWrite, urlLimiter, reprocessKnowledge);

router.put('/:id',
  canWrite,
  validate(knowledgeValidators.updateKnowledgeSchema),
  updateKnowledge
);

router.patch('/:id/archive', canWrite, archiveKnowledge);

router.delete('/:id', canWrite, deleteKnowledge);

module.exports = router;
