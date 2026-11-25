const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const controller = require('../controllers/integrationController');

const router = express.Router();
const canRead = [authenticate, requirePermission('knowledge', 'read')];
const canWrite = [authenticate, requirePermission('knowledge', 'write')];

router.get('/', canRead, controller.list);
router.post('/', canWrite, controller.save);
router.post('/microsoft/authorize', canWrite, controller.startMicrosoft);
router.post('/:id/sync', canWrite, controller.sync);
router.get('/:id/jobs', canRead, controller.jobs);
router.delete('/:id', canWrite, controller.disconnect);

module.exports = router;
