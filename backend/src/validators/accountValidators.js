const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

// Le mot de passe est la seule preuve de possession du compte : sans lui, un
// jeton volé suffirait à effacer une entreprise entière.
const deleteAccountSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': joiMessage('JOI_CURRENT_PASSWORD_REQUIRED'),
    'any.required': joiMessage('JOI_CURRENT_PASSWORD_REQUIRED'),
  }),
  // Renseigné uniquement quand le propriétaire doit transmettre l'entreprise.
  newOwnerId: Joi.string().uuid().optional().messages({
    'string.uuid': joiMessage('JOI_NEW_OWNER_INVALID'),
  }),
  // Confirmation explicite quand plus personne ne peut reprendre le compte.
  confirmCompanyDeletion: Joi.boolean().optional(),
});

module.exports = {
  deleteAccountSchema,
};
