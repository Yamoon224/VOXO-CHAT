// src/middleware/errorMiddleware.js
const config = require('../config/config');
const { requestLocale } = require('../i18n/locale');
const { translate } = require('../i18n/messages');

// Classe d'erreur personnalisée
class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = options.code || defaultErrorCode(statusCode);
    this.details = options.details;
    // Certaines réponses (ex. identifiants de connexion invalides) doivent
    // rester volontairement indistinguables entre elles : le message est
    // quand même traduit via `code`, mais ce dernier n'est pas exposé au
    // client pour ne rien laisser fuiter (ex. existence d'un compte).
    this.hideCode = Boolean(options.hideCode);
    // Quelques sites construisent un message dynamique déjà localisé (ex. un
    // libellé de ressource interpolé) : MESSAGES[code] ne peut porter qu'un
    // texte figé, donc translate() écraserait la partie dynamique. Ces sites
    // passent preTranslated: true pour que errorHandler renvoie `message` tel
    // quel, tout en gardant `code` stable pour les clients qui filtrent dessus.
    this.preTranslated = Boolean(options.preTranslated);

    Error.captureStackTrace(this, this.constructor);
  }
}

function defaultErrorCode(statusCode) {
  if (statusCode === 400) return 'VALIDATION_ERROR';
  if (statusCode === 401) return 'AUTH_REQUIRED';
  if (statusCode === 403) return 'ACCESS_DENIED';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
  return 'INTERNAL_ERROR';
}

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, { code: 'NOT_FOUND' });
  next(error);
};

// Gestionnaire d'erreurs Sequelize
const handleSequelizeError = (error) => {
  let message = 'Database error';
  let statusCode = 500;
  let code = 'DB_ERROR';

  switch (error.name) {
    case 'SequelizeValidationError':
      statusCode = 400;
      message = error.errors.map(err => err.message).join(', ');
      code = 'VALIDATION_ERROR';
      break;

    case 'SequelizeUniqueConstraintError':
      statusCode = 409;
      message = 'Resource already exists';
      code = 'DUPLICATE_RESOURCE';
      break;

    case 'SequelizeForeignKeyConstraintError':
      statusCode = 400;
      message = 'Invalid reference to related resource';
      code = 'INVALID_REFERENCE';
      break;

    case 'SequelizeDatabaseError':
      statusCode = 500;
      message = 'Database operation failed';
      code = 'DB_OPERATION_FAILED';
      break;

    default:
      statusCode = 500;
      message = 'Database error';
      code = 'DB_ERROR';
  }

  return new AppError(message, statusCode, { code });
};

// Middleware principal de gestion d'erreurs
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Erreurs Sequelize
  if (err.name && err.name.startsWith('Sequelize')) {
    error = handleSequelizeError(err);
  }

  // Erreur de cast MongoDB (si on utilise MongoDB plus tard)
  if (err.name === 'CastError') {
    error = new AppError('Invalid resource ID', 400, { code: 'INVALID_RESOURCE_ID' });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, { code: 'TOKEN_INVALID' });
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, { code: 'TOKEN_EXPIRED' });
  }

  // Préparer la réponse
  const statusCode = error.statusCode || 500;
  const resolvedCode = error.code || defaultErrorCode(statusCode);
  const response = {
    success: false,
    error: error.preTranslated
      ? (error.message || 'Internal server error')
      : translate(error.message || 'Internal server error', requestLocale(req), resolvedCode),
    ...(!error.hideCode && { code: resolvedCode }),
    ...(error.details && { details: error.details }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // En développement, inclure la stack trace
  if (config.env === 'development') {
    response.stack = err.stack;
    response.details = error;
  }

  // Envoyer la réponse d'erreur
  res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
};
