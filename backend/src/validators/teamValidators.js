const Joi = require('joi');
const { joiMessage } = require('./joiMessage');
const { RESOURCES, LEVELS } = require('../config/permissions');

// Ressources et niveaux dérivés de la matrice, jamais réécrits à la main.
//
// `stripUnknown: false` est imposé au niveau du schéma : le réglage global du
// middleware retirerait une ressource inconnue en silence, et le propriétaire
// croirait avoir accordé un accès qui n'a jamais été enregistré.
const permissionsSchema = Joi.object()
  .pattern(
    Joi.string().valid(...RESOURCES),
    Joi.string().valid(...LEVELS).messages({
      'any.only': joiMessage('JOI_ACCESS_LEVEL_INVALID'),
    })
  )
  .prefs({ stripUnknown: false, allowUnknown: false })
  .messages({
    'object.unknown': joiMessage('JOI_RESOURCE_UNKNOWN'),
  });

const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': joiMessage('JOI_EMAIL_INVALID'),
    'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
  }),
  role: Joi.string().valid('admin', 'user').required().messages({
    'any.only': joiMessage('JOI_ROLE_ADMIN_OR_USER'),
  }),
  permissions: permissionsSchema.default({}),
});

const updateMemberPermissionsSchema = Joi.object({
  permissions: permissionsSchema.required().messages({
    'any.required': joiMessage('JOI_PERMISSIONS_REQUIRED'),
  }),
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'user').required().messages({
    'any.only': joiMessage('JOI_ROLE_ADMIN_OR_USER'),
  }),
});

const updateMemberStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'any.required': joiMessage('JOI_MEMBER_STATUS_REQUIRED'),
  }),
});

// Suppression irréversible : le propriétaire prouve qu'il est bien derrière la session.
const deleteMemberSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': joiMessage('JOI_CURRENT_PASSWORD_REQUIRED'),
    'any.required': joiMessage('JOI_CURRENT_PASSWORD_REQUIRED'),
  }),
});

const acceptInvitationSchema = Joi.object({
  tenantId: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_TENANT_INVALID'),
  }),
  token: Joi.string().hex().length(64).required().messages({
    'string.empty': joiMessage('JOI_INVITATION_TOKEN_REQUIRED'),
  }),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$'))
    .required()
    .messages({
      'string.pattern.base': joiMessage('JOI_PASSWORD_PATTERN'),
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': joiMessage('JOI_PASSWORDS_MISMATCH'),
  }),
});

const listMembersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow('').default(''),
  role: Joi.string().valid('owner', 'admin', 'user').allow('').default(''),
  status: Joi.string().valid('active', 'inactive', 'all').default('active'),
});

const teamResourceParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_RESOURCE_ID_INVALID'),
  }),
});

module.exports = {
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateMemberPermissionsSchema,
  updateMemberStatusSchema,
  deleteMemberSchema,
  acceptInvitationSchema,
  listMembersSchema,
  teamResourceParamsSchema,
};
