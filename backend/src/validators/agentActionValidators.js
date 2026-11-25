// Validation des actions agent (tools API configurables par tenant, appelés
// par le chatbot). `parametersSchema` n'accepte qu'un sous-ensemble restreint
// de JSON Schema : suffisant pour du function calling LLM, sans les pièges
// d'un JSON Schema arbitraire (récursion, $ref, types composés) côté exécution.
const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

const NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const PARAM_TYPES = ['string', 'number', 'integer', 'boolean'];

const parametersSchemaJoi = Joi.object({
  type: Joi.string().valid('object').required(),
  properties: Joi.object()
    .pattern(
      /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/,
      Joi.object({
        type: Joi.string().valid(...PARAM_TYPES).required(),
        description: Joi.string().min(1).max(300).required(),
        enum: Joi.array().items(Joi.string(), Joi.number()).max(50).optional(),
      })
    )
    .default({}),
  required: Joi.array().items(Joi.string()).default([]),
}).messages({
  'object.base': joiMessage('JOI_PARAMS_SCHEMA_INVALID'),
});

// Pas de `.default({})` ici : ce schéma est réutilisé tel quel pour la mise à
// jour partielle, où une clé absente doit rester absente du payload validé —
// un défaut au niveau du champ la ferait apparaître à chaque update et
// écraserait silencieusement les en-têtes déjà enregistrés. Le défaut « objet
// vide » à la création est appliqué côté service (`agentActionService.create`).
const headersTemplateJoi = Joi.object()
  .pattern(Joi.string().max(100), Joi.string().max(500));

const baseFields = {
  name: Joi.string().pattern(NAME_PATTERN).max(64).messages({
    'string.pattern.base': joiMessage('JOI_NAME_SNAKE_CASE'),
  }),
  description: Joi.string().min(1).max(500).messages({
    'string.empty': joiMessage('JOI_ACTION_DESCRIPTION_REQUIRED'),
  }),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
  endpointUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).messages({
    'string.uri': joiMessage('JOI_ACTION_URL_INVALID'),
  }),
  parametersSchema: parametersSchemaJoi,
  headersTemplate: headersTemplateJoi,
  // Secret en clair fourni à l'écriture uniquement ; jamais renvoyé en lecture.
  // Chaîne vide = ne pas toucher au secret existant lors d'une mise à jour.
  authSecret: Joi.string().max(4096).allow(''),
  timeoutMs: Joi.number().integer().min(500).max(30000),
  isActive: Joi.boolean(),
};

const createAgentActionSchema = Joi.object({
  ...baseFields,
  name: baseFields.name.required(),
  description: baseFields.description.required(),
  method: baseFields.method.required(),
  endpointUrl: baseFields.endpointUrl.required(),
  parametersSchema: parametersSchemaJoi.required(),
});

const updateAgentActionSchema = Joi.object(baseFields).min(1).messages({
  'object.min': joiMessage('JOI_NO_CHANGES_TO_SAVE'),
});

module.exports = { createAgentActionSchema, updateAgentActionSchema };
