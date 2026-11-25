// Point de montage de /api/knowledge.
//
// Les routes sont réparties par niveau d'accès requis : knowledgeReadRoutes
// exige `knowledge:read`, knowledgeWriteRoutes exige `knowledge:write`. La
// lecture est montée en premier pour que ses routes littérales (/stats,
// /search, /crawl-jobs…) soient évaluées avant tout paramètre.
const express = require('express');

const knowledgeReadRoutes = require('./knowledgeReadRoutes');
const knowledgeWriteRoutes = require('./knowledgeWriteRoutes');

const router = express.Router();

router.use('/catalog', require('./catalogRoutes'));
router.use(knowledgeReadRoutes);
router.use(knowledgeWriteRoutes);

// Diagnostic OCR / PDF : jamais exposé en production.
if (process.env.NODE_ENV === 'development') {
  router.use(require('./knowledgeDevRoutes'));
}

module.exports = router;
