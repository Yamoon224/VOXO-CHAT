// src/validators/chatValidators.js
const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

const sendMessageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_MESSAGE_NOT_EMPTY'),
      'string.max': joiMessage('JOI_MESSAGE_MAX_2000'),
      'any.required': joiMessage('JOI_MESSAGE_REQUIRED')
    }),
  sessionId: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': joiMessage('JOI_SESSION_ID_NOT_EMPTY'),
      'string.max': joiMessage('JOI_SESSION_ID_MAX_255'),
    }),
  userId: Joi.string()
    .optional()
    .allow('')
    .max(255),
  
  metadata: Joi.object()
    .optional()
    .default({}),
});

const getHistorySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0),
});

const getConversationsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(20),
  
  status: Joi.string()
    .valid('active', 'ended', 'escalated')
    .optional(),
  
  userId: Joi.string()
    .optional(),

  priority: Joi.string()
    .valid('normal', 'important', 'urgent', 'critical')
    .optional(),

  labelId: Joi.string().pattern(/^[0-9a-f-]+(?:,[0-9a-f-]+)*$/i).optional(),

  sortBy: Joi.string().valid('updatedAt', 'priority').default('updatedAt'),

  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const endConversationSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.min': joiMessage('JOI_RATING_RANGE'),
      'number.max': joiMessage('JOI_RATING_RANGE'),
    }),
  
  feedback: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': joiMessage('JOI_COMMENT_MAX_1000'),
    }),
});

const updateConversationTitleSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120).required().messages({
    'string.empty': joiMessage('JOI_TITLE_NOT_EMPTY'),
    'string.max': joiMessage('JOI_TITLE_MAX_120'),
  }),
});

const updateConversationPrioritySchema = Joi.object({
  value: Joi.string().valid('normal', 'important', 'urgent', 'critical').allow(null).required(),
});

const labelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(40).required(),
  color: Joi.string().valid('slate', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink').required(),
});

const updateLabelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(40),
  color: Joi.string().valid('slate', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink'),
}).min(1);

const assignLabelsSchema = Joi.object({
  labelIds: Joi.array().items(Joi.string().uuid()).max(10).unique().required(),
});

const exportSelectedConversationsSchema = Joi.object({
  sessionIds: Joi.array().items(Joi.string().trim().min(1).max(255)).min(1).max(100).required(),
  format: Joi.string().valid('csv', 'zip').required(),
});

const emailConversationExportSchema = Joi.object({
  recipient: Joi.string().trim().lowercase().email().max(255).required().messages({
    'string.email': joiMessage('JOI_EMAIL_ADDRESS_INVALID'),
  }),
});
const updateCommercialRequestSchema = Joi.object({
  category: Joi.string().valid('order', 'repair', 'other'),
  outcomeStatus: Joi.string().valid('open', 'in_progress', 'successful', 'failed', 'cancelled'),
  resolutionReason: Joi.string().trim().max(2000).allow('', null),
  amount: Joi.number().integer().min(0).allow(null),
}).min(1);

module.exports = {
  chatValidators: {
    sendMessageSchema,
    getHistorySchema,
    getConversationsSchema,
    endConversationSchema,
    updateConversationTitleSchema,
    updateConversationPrioritySchema,
    labelSchema,
    updateLabelSchema,
    assignLabelsSchema,
    exportSelectedConversationsSchema,
    emailConversationExportSchema,
    updateCommercialRequestSchema,
  },
};
