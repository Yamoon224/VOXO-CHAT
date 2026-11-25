// Routes de diagnostic de la base de connaissances.
// Montées uniquement en développement par knowledgeRoutes.js.
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadConversationFile } = require('../middleware/uploadMiddleware');
const { successResponse } = require('../utils/responseUtils');
const extraction = require('../services/extraction');
const ocrService = require('../services/ocrService');
const advancedPDFService = require('../services/advancedPDFService');

const router = express.Router();

router.get('/test', authenticate, (req, res) => {
  successResponse(res, {
    message: 'Knowledge routes with OCR working!',
    tenant: req.tenant.name,
    user: `${req.user.firstName} ${req.user.lastName}`,
    newFeatures: {
      advancedOCR: true,
      pdfProcessing: true,
      imageOCR: true,
      automaticTagging: true,
      processingPreview: true,
      healthMonitoring: true,
    },
    availableEndpoints: {
      base: 'GET /api/knowledge',
      stats: 'GET /api/knowledge/stats',
      search: 'GET /api/knowledge/search?q=query',
      create: 'POST /api/knowledge',
      update: 'PUT /api/knowledge/:id',
      delete: 'DELETE /api/knowledge/:id',
      uploadOCR: 'POST /api/knowledge/upload (support OCR amélioré)',
      previewProcessing: 'POST /api/knowledge/processing/preview',
      capabilities: 'GET /api/knowledge/processing/capabilities',
      health: 'GET /api/knowledge/processing/health',
      reprocess: 'POST /api/knowledge/:id/reprocess',
      processingHistory: 'GET /api/knowledge/:id/processing-history',
      duplicate: 'POST /api/knowledge/:id/duplicate',
      archive: 'PATCH /api/knowledge/:id/archive',
      exportAdvanced: 'GET /api/knowledge/export/json?includeProcessingData=true',
      bulkImport: 'POST /api/knowledge/bulk-import',
      regenerateEmbeddings: 'POST /api/knowledge/regenerate-embeddings',
    },
  }, 'Knowledge API with OCR test successful');
});

// Upload dédié au test : le middleware d'upload partagé applique les mêmes
// règles de format et de taille que la route de production.
router.post('/test-ocr', authenticate, uploadConversationFile, async (req, res) => {
  try {
    const { buffer, originalname, mimetype, size } = req.file;
    const result = await extraction.extractText(buffer, originalname, mimetype);

    res.json({
      success: true,
      message: 'Test d extraction réussi',
      fileInfo: { originalName: originalname, mimeType: mimetype, size },
      extractionResult: {
        title: result.title,
        extractionMethod: result.extractionMethod,
        contentLength: result.content.length,
        contentPreview: result.content.slice(0, 200),
        metadata: result.metadata,
      },
    });
  } catch (error) {
    res.json({ success: false, message: 'Test d extraction échoué', error: error.message });
  }
});

router.get('/test-performance', authenticate, async (req, res, next) => {
  try {
    const [ocrHealth, pdfHealth] = await Promise.all([
      ocrService.healthCheck(),
      advancedPDFService.healthCheck(),
    ]);

    res.json({
      success: true,
      message: 'Statistiques de performance OCR',
      timestamp: new Date().toISOString(),
      services: {
        ocr: {
          status: ocrHealth.status,
          capabilities: ocrService.getCapabilities(),
          lastTest: ocrHealth.timestamp,
        },
        pdf: {
          status: pdfHealth.status,
          stats: advancedPDFService.getStats(),
          lastTest: pdfHealth.timestamp,
        },
      },
      recommendations: {
        maxFileSize: '100MB pour PDFs, 50MB pour images',
        optimalImageFormats: ['PNG', 'JPEG'],
        bestPractices: [
          'Utilisez des images haute résolution pour un meilleur OCR',
          'Les PDFs avec texte natif sont traités plus rapidement',
          'Les images en noir et blanc donnent de meilleurs résultats OCR',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
