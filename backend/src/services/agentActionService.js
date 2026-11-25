// CRUD tenant-scopé des actions agent (tools API que le chatbot peut appeler).
// `authSecretEncrypted` n'est jamais exposé : la représentation publique ne
// porte qu'un booléen `hasSecret`.
const { AgentAction } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');
const cryptoUtils = require('../utils/cryptoUtils');
const ssrfGuard = require('../utils/ssrfGuard');

const MAX_ACTIONS_PER_TENANT = 50;

function toPublic(action) {
  return {
    id: action.id,
    name: action.name,
    description: action.description,
    method: action.method,
    endpointUrl: action.endpointUrl,
    parametersSchema: action.parametersSchema,
    headersTemplate: action.headersTemplate,
    hasSecret: Boolean(action.authSecretEncrypted),
    timeoutMs: action.timeoutMs,
    isActive: action.isActive,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

async function list(tenantId) {
  const actions = await AgentAction.findAll({ where: { tenantId }, order: [['name', 'ASC']] });
  return actions.map(toPublic);
}

/** Réservé aux appelants internes (boucle de tool calling) : lignes complètes, secret compris. */
async function listActiveByTenant(tenantId) {
  return AgentAction.findAll({ where: { tenantId, isActive: true } });
}

async function findOwned(tenantId, id) {
  const action = await AgentAction.findOne({ where: { tenantId, id } });
  if (!action) throw new AppError('Action agent introuvable', 404, { code: 'AGENT_ACTION_NOT_FOUND' });
  return action;
}

function throwIfNameTaken(error) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    throw new AppError('Une action portant ce nom existe déjà', 409, { code: 'AGENT_ACTION_NAME_EXISTS' });
  }
  throw error;
}

async function create(tenantId, payload) {
  if (await AgentAction.count({ where: { tenantId } }) >= MAX_ACTIONS_PER_TENANT) {
    // Limite interpolée : texte résolu ici, MESSAGES[code] ne portant qu'une
    // chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
    throw new AppError(
      dynamicMessage({
        fr: `Maximum de ${MAX_ACTIONS_PER_TENANT} actions agent atteint`,
        en: `Maximum of ${MAX_ACTIONS_PER_TENANT} agent actions reached`,
      }),
      400,
      { code: 'AGENT_ACTION_LIMIT_REACHED', preTranslated: true }
    );
  }

  await ssrfGuard.assertPublicUrl(payload.endpointUrl);

  try {
    const action = await AgentAction.create({
      tenantId,
      name: payload.name,
      description: payload.description,
      method: payload.method,
      endpointUrl: payload.endpointUrl,
      parametersSchema: payload.parametersSchema,
      headersTemplate: payload.headersTemplate || {},
      authSecretEncrypted: payload.authSecret ? cryptoUtils.encrypt(payload.authSecret) : null,
      timeoutMs: payload.timeoutMs,
      isActive: payload.isActive,
    });
    return toPublic(action);
  } catch (error) {
    return throwIfNameTaken(error);
  }
}

async function update(tenantId, id, payload) {
  const action = await findOwned(tenantId, id);

  if (payload.endpointUrl) await ssrfGuard.assertPublicUrl(payload.endpointUrl);

  const changes = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.method !== undefined && { method: payload.method }),
    ...(payload.endpointUrl !== undefined && { endpointUrl: payload.endpointUrl }),
    ...(payload.parametersSchema !== undefined && { parametersSchema: payload.parametersSchema }),
    ...(payload.headersTemplate !== undefined && { headersTemplate: payload.headersTemplate }),
    ...(payload.timeoutMs !== undefined && { timeoutMs: payload.timeoutMs }),
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  };

  // Chaîne vide = on ne touche pas au secret existant ; une valeur non vide le remplace.
  if (payload.authSecret) changes.authSecretEncrypted = cryptoUtils.encrypt(payload.authSecret);

  try {
    await action.update(changes);
  } catch (error) {
    return throwIfNameTaken(error);
  }
  return toPublic(action);
}

async function remove(tenantId, id) {
  const action = await findOwned(tenantId, id);
  await action.destroy();
}

module.exports = {
  list, listActiveByTenant, findOwned, create, update, remove, toPublic,
};
