const Joi = require('joi');
const { joiMessage } = require('./joiMessage');
const { RESOURCES, LEVELS } = require('../config/adminPermissions');
// Les forfaits proposables viennent du registre, jamais d'une liste réécrite
// à la main : les deux ne peuvent pas diverger.

// Ressources et niveaux dérivés de la matrice, jamais réécrits à la main.
//
// `stripUnknown: false` est imposé au niveau du schéma : le réglage global du
// middleware retirerait une ressource inconnue en silence, et le super
// administrateur croirait avoir accordé un accès jamais enregistré.
const permissionsSchema = Joi.object()
  .pattern(
    Joi.string().valid(...RESOURCES),
    Joi.string().valid(...LEVELS).messages({
      'any.only': joiMessage('JOI_ACCESS_LEVEL_INVALID'),
    })
  )
  .prefs({ stripUnknown: false, allowUnknown: false })
  .messages({ 'object.unknown': 'Cette ressource n’existe pas' });

const passwordSchema = Joi.string()
  .min(8)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$'))
  .required()
  .messages({
    'string.pattern.base': joiMessage('JOI_PASSWORD_PATTERN'),
  });

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': joiMessage('JOI_EMAIL_INVALID'),
    'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
  }),
  password: Joi.string().required().messages({
    'string.empty': joiMessage('JOI_PASSWORD_REQUIRED'),
  }),
});

const adminRefreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': joiMessage('JOI_REFRESH_TOKEN_REQUIRED'),
  }),
});

const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).required().messages({
    'string.empty': joiMessage('JOI_ROLE_NAME_REQUIRED'),
    'string.max': joiMessage('JOI_ROLE_NAME_MAX_40'),
  }),
  permissions: permissionsSchema.default({}),
});

const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(40),
  permissions: permissionsSchema,
}).min(1).messages({
  'object.min': joiMessage('JOI_NO_CHANGES_PROVIDED'),
});

const inviteAdminSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': joiMessage('JOI_EMAIL_INVALID'),
    'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
  }),
  roleId: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_ROLE_INVALID'),
    'any.required': joiMessage('JOI_ROLE_REQUIRED'),
  }),
});

const updateAdminRoleSchema = Joi.object({
  roleId: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_ROLE_INVALID'),
    'any.required': joiMessage('JOI_ROLE_REQUIRED'),
  }),
});

const updateAdminStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'any.required': joiMessage('JOI_ACCOUNT_STATUS_REQUIRED'),
  }),
});

const acceptAdminInvitationSchema = Joi.object({
  token: Joi.string().hex().length(64).required().messages({
    'string.empty': joiMessage('JOI_INVITATION_TOKEN_REQUIRED'),
  }),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  password: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': joiMessage('JOI_PASSWORDS_MISMATCH'),
  }),
});

const listAdminsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow('').default(''),
  roleId: Joi.string().uuid().allow('').default(''),
  status: Joi.string().valid('active', 'inactive', 'all').default('active'),
});

const listTenantsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow('').default(''),
  subscriptionPlan: Joi.string().trim().max(40).allow('').default(''),
  status: Joi.string().valid('active', 'inactive', 'all').default('all'),
});

const updateTenantStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'any.required': joiMessage('JOI_TENANT_STATUS_REQUIRED'),
  }),
});

const updateTenantPlanSchema = Joi.object({
  subscriptionPlan: Joi.string().trim().max(40).required().messages({
    'any.required': joiMessage('JOI_PLAN_REQUIRED'),
  }),
  // `null` retire l'échéance (abonnement sans date de fin) ; absent = inchangé.
  subscriptionExpiresAt: Joi.date().iso().allow(null).messages({
    'date.format': joiMessage('JOI_DUE_DATE_INVALID'),
  }),
});

// `null` est explicitement accepté sur les limites : c'est ainsi qu'on rend
// une ressource illimitée, ce qui n'est pas la même chose que ne rien envoyer.
const optionalLimit = Joi.number().integer().min(0).allow(null);
const planPrices = Joi.object({
  EUR: Joi.number().integer().min(0).allow(null).required(),
  USD: Joi.number().integer().min(0).allow(null).required(),
  XOF: Joi.number().integer().min(0).allow(null).required(),
});

const updateAdminLocaleSchema = Joi.object({
  preferredLocale: Joi.string().valid('fr', 'en').required(),
});

const updatePlanSchema = Joi.object({
  label: Joi.string().trim().min(2).max(40),
  priceAmount: Joi.number().integer().min(0).messages({
    'number.base': joiMessage('JOI_PRICE_IN_CENTS'),
    'number.min': joiMessage('JOI_PRICE_NOT_NEGATIVE'),
  }),
  priceCurrency: Joi.string().trim().uppercase().length(3),
  prices: planPrices,
  billingInterval: Joi.string().valid('monthly', 'yearly'),
  creditsPerCycle: Joi.number().integer().min(0),
  allowVisitorAttachments: Joi.boolean(),
  allowAgentAttachments: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
  messagesPerMonth: optionalLimit,
  messagesPerDay: optionalLimit,
  maxUsers: Joi.number().integer().min(1).allow(null),
  activeDocuments: optionalLimit,
  features: Joi.object().pattern(Joi.string(), Joi.boolean()),
}).min(1).messages({
  'object.min': joiMessage('JOI_NO_CHANGES_PROVIDED'),
});

const createPlanSchema = updatePlanSchema.keys({
  name: Joi.string().trim().lowercase().pattern(/^[a-z0-9_-]+$/).min(2).max(40).required(),
  label: Joi.string().trim().min(2).max(40).required(),
  prices: planPrices.required(),
});

const adminResourceParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_RESOURCE_ID_INVALID'),
  }),
});

module.exports = {
  adminLoginSchema,
  adminRefreshTokenSchema,
  createRoleSchema,
  updateRoleSchema,
  inviteAdminSchema,
  updateAdminRoleSchema,
  updateAdminStatusSchema,
  acceptAdminInvitationSchema,
  listAdminsSchema,
  listTenantsSchema,
  updateTenantStatusSchema,
  updateTenantPlanSchema,
  updatePlanSchema,
  createPlanSchema,
  adminResourceParamsSchema,
  updateAdminLocaleSchema,
};
