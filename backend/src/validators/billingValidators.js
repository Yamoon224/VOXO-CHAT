const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

const billingCurrencySchema = Joi.object({
  currency: Joi.string().valid('EUR', 'USD', 'XOF').required().messages({
    'any.only': joiMessage('JOI_CURRENCY_INVALID'),
    'any.required': joiMessage('JOI_CURRENCY_REQUIRED'),
  }),
});

module.exports = { billingCurrencySchema };
