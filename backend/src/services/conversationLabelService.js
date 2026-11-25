const { sequelize, Conversation, ConversationLabel, ConversationLabelAssignment } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const events = require('./conversationEventService');

const COLORS = new Set(['slate', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink']);

function publicLabel(label) {
  return {
    id: label.id, name: label.name, color: label.color,
    createdBy: label.createdBy || null, createdAt: label.createdAt || null, updatedAt: label.updatedAt || null,
  };
}

async function list(tenantId) {
  const labels = await ConversationLabel.findAll({ where: { tenantId }, order: [['name', 'ASC']] });
  return labels.map(publicLabel);
}

async function create(tenantId, userId, data) {
  if (await ConversationLabel.count({ where: { tenantId } }) >= 50) {
    throw new AppError('Maximum de 50 étiquettes atteint', 400, { code: 'LABEL_LIMIT_REACHED' });
  }
  try {
    const label = await ConversationLabel.create({ tenantId, createdBy: userId, name: data.name.trim(), color: data.color });
    return publicLabel(label);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Une étiquette portant ce nom existe déjà', 409, { code: 'LABEL_NAME_EXISTS' });
    }
    throw error;
  }
}

async function findLabel(tenantId, id) {
  const label = await ConversationLabel.findOne({ where: { tenantId, id } });
  if (!label) throw new AppError('Étiquette introuvable', 404, { code: 'LABEL_NOT_FOUND' });
  return label;
}

async function update(tenantId, id, data) {
  const label = await findLabel(tenantId, id);
  try {
    await label.update({ ...(data.name && { name: data.name.trim() }), ...(data.color && { color: data.color }) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Une étiquette portant ce nom existe déjà', 409, { code: 'LABEL_NAME_EXISTS' });
    }
    throw error;
  }
  return publicLabel(label);
}

async function remove(tenantId, id) {
  const label = await findLabel(tenantId, id);
  await label.destroy();
}

async function assign(tenantId, sessionId, labelIds) {
  const conversation = await Conversation.findOne({ where: { tenantId, sessionId } });
  if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
  const uniqueIds = [...new Set(labelIds)];
  const labels = await ConversationLabel.findAll({ where: { tenantId, id: uniqueIds } });
  if (labels.length !== uniqueIds.length) throw new AppError('Une étiquette est invalide', 400, { code: 'INVALID_LABEL' });
  await sequelize.transaction(async transaction => {
    await ConversationLabelAssignment.destroy({ where: { tenantId, conversationId: conversation.id }, transaction });
    if (labels.length) await ConversationLabelAssignment.bulkCreate(labels.map(label => ({
      tenantId, conversationId: conversation.id, labelId: label.id,
    })), { transaction });
  });
  events.publish(tenantId, sessionId, { type: 'conversation.updated', labels: labels.map(publicLabel) });
  return labels.map(publicLabel);
}

module.exports = { COLORS, list, create, update, remove, assign, publicLabel };
