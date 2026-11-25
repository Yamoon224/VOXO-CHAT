const express = require('express');
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { requireSystemRole } = require('../middleware/adminPermissionMiddleware');
const { validate, validateParams } = require('../middleware/validationMiddleware');
const adminRoleController = require('../controllers/adminRoleController');
const {
  createRoleSchema,
  updateRoleSchema,
  adminResourceParamsSchema,
} = require('../validators/adminValidators');

const router = express.Router();

router.use(authenticateAdmin);

// Lecture ouverte à tout administrateur : le sélecteur de rôle de l'écran
// d'invitation en a besoin, et connaître les noms de rôles n'accorde rien.
router.get('/', adminRoleController.listRoles);

// Définir les rôles ne peut pas être une simple permission : ce serait
// s'accorder soi-même n'importe quel accès.
router.post('/', requireSystemRole, validate(createRoleSchema), adminRoleController.createRole);
router.patch(
  '/:id',
  requireSystemRole,
  validateParams(adminResourceParamsSchema),
  validate(updateRoleSchema),
  adminRoleController.updateRole
);
router.delete(
  '/:id',
  requireSystemRole,
  validateParams(adminResourceParamsSchema),
  adminRoleController.deleteRole
);

module.exports = router;
