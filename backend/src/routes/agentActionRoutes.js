// Routes des actions agent (tools API que le chatbot peut appeler pour les
// visiteurs du widget). Montées sous /api/tenant/agent-actions dans
// tenantRoutes.js, qui apporte déjà `authenticate` + `extractTenantFromRequest`.
const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { createAgentActionSchema, updateAgentActionSchema } = require('../validators/agentActionValidators');
const controller = require('../controllers/agentActionController');

const router = express.Router();

// Configurer des actions agent, c'est modifier ce que le chatbot est autorisé
// à faire au nom de l'entreprise : même garde que le reste des paramètres
// entreprise (`company`), pas une ressource à part.
const canRead = [authenticate, requirePermission('agentic', 'read')];
const canWrite = [authenticate, requirePermission('agentic', 'write')];

router.get('/', canRead, controller.list);
router.get('/usage', canRead, controller.usage);
router.put('/settings', canWrite, controller.updateSettings);
router.post('/', canWrite, validate(createAgentActionSchema), controller.create);
router.put('/:id', canWrite, validate(updateAgentActionSchema), controller.update);
router.delete('/:id', canWrite, controller.remove);
router.post('/:id/test', canWrite, controller.test);

module.exports = router;
