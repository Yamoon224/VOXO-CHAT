const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, validateParams, validateQuery } = require('../middleware/validationMiddleware');
const teamController = require('../controllers/teamController');
const {
  deleteMemberSchema,
  inviteMemberSchema,
  listMembersSchema,
  teamResourceParamsSchema,
  updateMemberPermissionsSchema,
  updateMemberRoleSchema,
  updateMemberStatusSchema,
} = require('../validators/teamValidators');

const router = express.Router();
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives d’invitation. Réessayez plus tard.' },
});

router.use(authenticate);
router.get('/members', validateQuery(listMembersSchema), teamController.listMembers);
router.post('/invitations', invitationLimiter, validate(inviteMemberSchema), teamController.inviteMember);
router.post('/invitations/:id/resend', invitationLimiter, validateParams(teamResourceParamsSchema), teamController.resendInvitation);
router.delete('/invitations/:id', validateParams(teamResourceParamsSchema), teamController.revokeInvitation);
router.patch('/members/:id/role', validateParams(teamResourceParamsSchema), validate(updateMemberRoleSchema), teamController.updateMemberRole);
// Accès par ressource : réservé au propriétaire (assertCanUpdatePermissions).
router.patch('/members/:id/permissions', validateParams(teamResourceParamsSchema), validate(updateMemberPermissionsSchema), teamController.updateMemberPermissions);
// Blocage/déblocage et suppression sont deux actions distinctes : la première
// se révoque, la seconde déclenche la purge à 30 jours.
router.patch('/members/:id/status', validateParams(teamResourceParamsSchema), validate(updateMemberStatusSchema), teamController.updateMemberStatus);
router.delete('/members/:id', validateParams(teamResourceParamsSchema), validate(deleteMemberSchema), teamController.deleteMember);

module.exports = router;
