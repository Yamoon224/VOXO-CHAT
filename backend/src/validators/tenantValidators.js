const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

// Une chaîne vide est acceptée et vaut « effacer le champ » : le hook
// beforeValidate du modèle Tenant la convertit en null.
const updateTenantSettingsSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .messages({
      'string.min': joiMessage('JOI_COMPANY_NAME_MIN_2'),
      'string.max': joiMessage('JOI_COMPANY_NAME_MAX_255'),
      'string.empty': joiMessage('JOI_COMPANY_NAME_REQUIRED'),
    }),

  domain: Joi.string()
    .trim()
    .allow('')
    .max(255)
    // `{ allowRelative: true }` accepte le domaine nu (voxo.app) comme l'URL
    // complète : exiger le protocole piégeait les utilisateurs.
    .uri({ allowRelative: true })
    .messages({
      'string.uri': joiMessage('JOI_WEBSITE_INVALID'),
      'string.max': joiMessage('JOI_WEBSITE_MAX_255'),
    }),

  subdomain: Joi.string()
    .trim()
    .allow('')
    .alphanum()
    // Normalisé en minuscules : sans cela « Acme » et « acme » cohabiteraient
    // malgré l'index unique.
    .lowercase()
    .min(3)
    .max(50)
    .messages({
      'string.alphanum': joiMessage('JOI_SUBDOMAIN_ALPHANUM'),
      'string.min': joiMessage('JOI_SUBDOMAIN_MIN_3'),
      'string.max': joiMessage('JOI_SUBDOMAIN_MAX_50'),
    }),
}).min(1).messages({
  'object.min': joiMessage('JOI_NO_CHANGES_TO_SAVE'),
});

const conversationExportRecipientsSchema = Joi.object({
  allowedRecipients: Joi.array().items(Joi.string().trim().lowercase().email().max(255)).max(50).required(),
});

module.exports = {
  updateTenantSettingsSchema,
  conversationExportRecipientsSchema,
};
