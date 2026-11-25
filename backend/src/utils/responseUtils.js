// src/utils/responseUtils.js

// Réponse de succès standardisée
const { requestLocale } = require('../i18n/locale');
const { translate } = require('../i18n/messages');

const localize = (res, message, code) => translate(message, requestLocale(res.req), code);

const successResponse = (res, data, message = 'Success', statusCode = 200, code = 'SUCCESS') => {
  return res.status(statusCode).json({
    success: true,
    code,
    message: localize(res, message, code),
    data,
    timestamp: new Date().toISOString(),
  });
};

// Réponse de succès avec pagination
const paginatedResponse = (res, data, pagination, message = 'Success', code = 'SUCCESS') => {
  return res.status(200).json({
    success: true,
    code,
    message: localize(res, message, code),
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

// Réponse d'erreur standardisée
const errorResponse = (res, message = 'Error occurred', statusCode = 500, details = null, code = 'INTERNAL_ERROR') => {
  const response = {
    success: false,
    code,
    error: localize(res, message, code),
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse,
};
