const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const controller = require('../controllers/notificationController');

function routes(authenticateRequest) {
  const router = express.Router();
  router.use(authenticateRequest);
  router.get('/', controller.list);
  router.post('/:id/read', controller.markRead);
  router.post('/read-all', controller.markAllRead);
  return router;
}

module.exports = { tenantNotificationRoutes: routes(authenticate), adminNotificationRoutes: routes(authenticateAdmin) };
