const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChannelUser = sequelize.define('ChannelUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'Tenant',
      key: 'id',
    },
  },
  channel: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: {
      isIn: [['web', 'telegram', 'whatsapp']],
    },
  },
  externalUserId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'external_user_id',
    validate: {
      notEmpty: true,
    },
  },
}, {
  tableName: 'channel_users',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['tenant_id', 'channel', 'external_user_id'],
      unique: true,
      name: 'channel_users_tenant_channel_external_unique_idx',
    },
  ],
});

module.exports = ChannelUser;
