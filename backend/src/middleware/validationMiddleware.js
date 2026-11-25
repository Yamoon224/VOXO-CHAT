// src/middleware/validationMiddleware.js
const { AppError } = require('./errorMiddleware');

// Middleware de validation générique
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Retourner toutes les erreurs
      allowUnknown: false, // Rejeter les champs non définis
      stripUnknown: true, // Supprimer les champs non définis
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      // Code explicite (auparavant déduit du statut 400) : errorHandler traduit
      // via MESSAGES.VALIDATION_ERROR, le détail Joi restant volontairement
      // générique côté client. Les schémas Joi passent par joiMessage() pour
      // rester routables par code si ce choix évolue un jour.
      return next(new AppError(errorMessage, 400, { code: 'VALIDATION_ERROR' }));
    }

    // Remplacer req.body par les données validées et nettoyées
    req.body = value;
    next();
  };
};

const validateRequestPart = (schema, source, target) => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });
  if (error) {
    const message = error.details.map(detail => detail.message).join(', ');
    return next(new AppError(message, 400, { code: 'VALIDATION_ERROR' }));
  }
  req[target] = value;
  next();
};

const validateQuery = schema => validateRequestPart(schema, 'query', 'validatedQuery');
const validateParams = schema => validateRequestPart(schema, 'params', 'validatedParams');

module.exports = { validate, validateQuery, validateParams };
