// src/validators/authValidators.js
const Joi = require('joi');
const { joiMessage } = require('./joiMessage');
const localeSchema = Joi.string().valid('fr', 'en');

// Schéma de validation pour l'inscription
const registerSchema = Joi.object({
  // Données entreprise
  companyName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_COMPANY_NAME_REQUIRED'),
      'string.min': joiMessage('JOI_COMPANY_NAME_MIN_2'),
      'string.max': joiMessage('JOI_COMPANY_NAME_MAX_100'),
    }),
  
  // Le site web de l'entreprise n'est pas demandé à l'inscription : il se
  // renseigne dans Réglages > Entreprise, où son unicité est déjà contrôlée.

  subdomain: Joi.string()
    .alphanum()
    // Normalisé en minuscules : sans cela « Acme » et « acme » franchiraient
    // tous deux la vérification de disponibilité et l'index unique.
    .lowercase()
    .min(3)
    .max(50)
    .optional()
    .allow('', null)
    .messages({
      'string.alphanum': joiMessage('JOI_SUBDOMAIN_ALPHANUM'),
      'string.min': joiMessage('JOI_SUBDOMAIN_MIN_3'),
      'string.max': joiMessage('JOI_SUBDOMAIN_MAX_50'),
    }),
  
  subscriptionPlan: Joi.string()
    .valid('free', 'basic', 'pro', 'enterprise')
    .default('free')
    .messages({
      'any.only': joiMessage('JOI_SUBSCRIPTION_PLAN_INVALID'),
    }),

  // Données utilisateur
  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_FIRST_NAME_REQUIRED'),
      'string.max': joiMessage('JOI_FIRST_NAME_MAX_50'),
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_LAST_NAME_REQUIRED'),
      'string.max': joiMessage('JOI_LAST_NAME_MAX_50'),
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': joiMessage('JOI_EMAIL_INVALID'),
      'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>])[A-Za-z\\d@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>]'))
    .required()
    .messages({
      'string.min': joiMessage('JOI_PASSWORD_MIN_8'),
      'string.pattern.base': joiMessage('JOI_PASSWORD_PATTERN_LONG'),
      'string.empty': joiMessage('JOI_PASSWORD_REQUIRED'),
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': joiMessage('JOI_PASSWORD_CONFIRM_MISMATCH'),
      'string.empty': joiMessage('JOI_PASSWORD_CONFIRM_REQUIRED'),
    }),
  preferredLocale: localeSchema.default('fr'),
});

// Schéma de validation pour la connexion
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': joiMessage('JOI_EMAIL_INVALID'),
      'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': joiMessage('JOI_PASSWORD_REQUIRED'),
    }),
  
  tenantId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': joiMessage('JOI_TENANT_ID_UUID'),
    }),
});

// Schéma pour le refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': joiMessage('JOI_REFRESH_TOKEN_REQUIRED'),
    }),
});

// Schéma pour la mise à jour du profil
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_FIRST_NAME_REQUIRED'),
      'string.max': joiMessage('JOI_FIRST_NAME_MAX_50'),
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_LAST_NAME_REQUIRED'),
      'string.max': joiMessage('JOI_LAST_NAME_MAX_50'),
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': joiMessage('JOI_EMAIL_INVALID'),
      'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
    }),
  preferredLocale: localeSchema.optional(),
});

// Schéma pour le changement de mot de passe
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': joiMessage('JOI_CURRENT_PASSWORD_REQUIRED'),
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>])[A-Za-z\\d@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>]'))
    .required()
    .messages({
      'string.min': joiMessage('JOI_NEW_PASSWORD_MIN_8'),
      'string.pattern.base': joiMessage('JOI_NEW_PASSWORD_PATTERN'),
      'string.empty': joiMessage('JOI_NEW_PASSWORD_REQUIRED'),
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': joiMessage('JOI_NEW_PASSWORD_CONFIRM_MISMATCH'),
      'string.empty': joiMessage('JOI_NEW_PASSWORD_CONFIRM_REQUIRED'),
    }),
});

// Schéma pour l'oubli de mot de passe
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': joiMessage('JOI_EMAIL_INVALID'),
      'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
    }),
});

// Schéma pour la réinitialisation de mot de passe
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': joiMessage('JOI_TOKEN_REQUIRED'),
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>])[A-Za-z\\d@$!%*?&.,;:\'"#{}()\\[\\]\\-_+=~`|\\\\/<>]'))
    .required()
    .messages({
      'string.min': joiMessage('JOI_NEW_PASSWORD_MIN_8'),
      'string.pattern.base': joiMessage('JOI_NEW_PASSWORD_PATTERN'),
      'string.empty': joiMessage('JOI_NEW_PASSWORD_REQUIRED'),
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': joiMessage('JOI_NEW_PASSWORD_CONFIRM_MISMATCH'),
      'string.empty': joiMessage('JOI_NEW_PASSWORD_CONFIRM_REQUIRED'),
    }),
});

// Schéma pour la confirmation d'adresse email
const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': joiMessage('JOI_TOKEN_REQUIRED'),
    }),
});

// Schéma pour le renvoi du lien de vérification
const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': joiMessage('JOI_EMAIL_INVALID'),
      'string.empty': joiMessage('JOI_EMAIL_REQUIRED'),
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
