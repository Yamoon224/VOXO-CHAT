const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { uploadCatalogFile } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../config/knowledgeRateLimits');
const controller = require('../controllers/catalogController');

const router = express.Router();
const canRead = [authenticate, requirePermission('knowledge', 'read')];
const canWrite = [authenticate, requirePermission('knowledge', 'write')];
const allowLongCatalogAnalysis = (req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
};

router.get('/', canRead, controller.listCollections);
router.get('/assets/:assetId/url', canRead, controller.getAssetUrl);
router.post('/', canWrite, controller.createCollection);
router.post('/:id/import', canWrite, uploadLimiter, allowLongCatalogAnalysis, uploadCatalogFile, controller.importCatalogFile);
router.post('/:id/sources/:assetId/reanalyse', canWrite, allowLongCatalogAnalysis, controller.reanalyzeSource);
router.delete('/:id/products', canWrite, controller.bulkDeleteProducts);
router.patch('/:id/products/review', canWrite, controller.bulkReviewProducts);
router.patch('/products/:productId', canWrite, controller.updateProduct);
router.patch('/products/:productId/move', canWrite, controller.moveProduct);
router.post('/products/:productId/split', canWrite, controller.splitProduct);
router.post('/products/merge', canWrite, controller.mergeProducts);
router.delete('/products/:productId', canWrite, controller.deleteProduct);
router.patch('/:id', canWrite, controller.updateCollection);
router.post('/:id/archive', canWrite, controller.archiveCollection);
router.post('/:id/restore', canWrite, controller.restoreCollection);
router.post('/:id/publish', canWrite, controller.publishCollection);
router.delete('/:id', canWrite, controller.purgeCollection);

module.exports = router;
