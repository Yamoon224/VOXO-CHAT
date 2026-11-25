const Joi = require('joi');
const { joiMessage } = require('./joiMessage');
const { STATUSES, PRIORITIES, REASONS } = require('../models/SupportTicket');
const { PLAN_NAMES } = require('../config/quotaPlans');

const messageContent = Joi.string().trim().min(1).max(5000).required().messages({
  'string.empty': joiMessage('JOI_MESSAGE_NOT_EMPTY'),
  'string.max': joiMessage('JOI_MESSAGE_MAX_5000'),
  'any.required': joiMessage('JOI_MESSAGE_REQUIRED'),
});

// Clé d'idempotence fournie par le client : un renvoi après échec réseau ne
// doit pas dupliquer le message. Facultative — le serveur en génère une sinon.
const clientMessageId = Joi.string().uuid().messages({
  'string.uuid': joiMessage('JOI_MESSAGE_ID_INVALID'),
});

const createTicketSchema = Joi.object({
  message: messageContent,
  reason: Joi.string().valid(...REASONS).required().messages({
    'any.only': joiMessage('JOI_SUBJECT_INVALID'),
    'any.required': joiMessage('JOI_SUBJECT_REQUIRED'),
  }),
  otherReason: Joi.when('reason', {
    is: 'other', then: Joi.string().trim().min(3).max(120).required(),
    otherwise: Joi.string().trim().max(120).allow('', null).default(null),
  }),
});

const createPlanChangeRequestSchema = Joi.object({
  requestedPlan: Joi.string().valid(...PLAN_NAMES).required(),
  note: Joi.string().trim().max(5000).allow('').default(''),
});

const approvePlanChangeSchema = Joi.object({
  subscriptionExpiresAt: Joi.date().iso().greater('now').required().messages({
    'date.greater': joiMessage('JOI_DUE_DATE_FUTURE'),
    'any.required': joiMessage('JOI_DUE_DATE_REQUIRED'),
  }),
});

const replyTicketSchema = Joi.object({
  content: messageContent,
  clientMessageId,
});

// `internal` n'existe que côté administration : une note interne ne doit
// jamais pouvoir être demandée depuis le tenant.
const adminReplySchema = Joi.object({
  content: messageContent,
  internal: Joi.boolean().default(false),
  clientMessageId,
});

const listTicketsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  // `open` regroupe les demandes non traitées (ouvertes et en attente).
  status: Joi.string().valid('open', ...STATUSES, 'all').default('open'),
  priority: Joi.string().valid(...PRIORITIES).allow('').default(''),
  reason: Joi.string().valid(...REASONS).allow('').default(''),
  assignedToMe: Joi.boolean().default(false),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required().messages({
    'any.only': joiMessage('JOI_STATUS_INVALID'),
    'any.required': joiMessage('JOI_STATUS_REQUIRED'),
  }),
});

const assignTicketSchema = Joi.object({
  // `null` retire l'assignation ; absent = on s'attribue la demande.
  adminId: Joi.string().uuid().allow(null),
});

const supportResourceParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': joiMessage('JOI_REQUEST_ID_INVALID'),
  }),
});

module.exports = {
  createTicketSchema,
  createPlanChangeRequestSchema,
  approvePlanChangeSchema,
  replyTicketSchema,
  adminReplySchema,
  listTicketsSchema,
  updateStatusSchema,
  assignTicketSchema,
  supportResourceParamsSchema,
};
