const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

/**
 * Période des statistiques, commune aux deux zones.
 *
 * Le tableau de bord client et `/admin/stats` acceptent exactement les mêmes
 * fenêtres, et `statsWindow.PERIOD_DAYS` les connaît côté service. Ce schéma
 * vivait dans `adminValidators` : le routeur client aurait dû importer un
 * validateur d'administration pour valider une requête de client.
 */
const statsPeriodSchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d').default('30d').messages({
    'any.only': joiMessage('JOI_PERIOD_INVALID'),
  }),
});

module.exports = { statsPeriodSchema };
