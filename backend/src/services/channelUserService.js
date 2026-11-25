const { UniqueConstraintError } = require('sequelize');
const { ChannelUser } = require('../models');

const SUPPORTED_CHANNELS = new Set(['web', 'telegram', 'whatsapp']);

function mappingWhere({ tenantId, channel, externalUserId }) {
  if (!tenantId) {
    throw new TypeError('tenantId is required');
  }
  if (!SUPPORTED_CHANNELS.has(channel)) {
    throw new TypeError('Unsupported channel');
  }
  if (!externalUserId) {
    throw new TypeError('externalUserId is required');
  }

  return {
    tenantId,
    channel,
    externalUserId: String(externalUserId),
  };
}

async function resolveChannelUser(input) {
  const where = mappingWhere(input);

  try {
    const [channelUser] = await ChannelUser.findOrCreate({
      where,
      defaults: where,
    });
    return channelUser;
  } catch (error) {
    if (!(error instanceof UniqueConstraintError) && error?.name !== 'SequelizeUniqueConstraintError') {
      throw error;
    }

    const channelUser = await ChannelUser.findOne({ where });
    if (!channelUser) {
      throw error;
    }
    return channelUser;
  }
}

module.exports = {
  resolveChannelUser,
};
