const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  recipientType: { type: DataTypes.STRING(16), allowNull: false, field: 'recipient_type', validate: { isIn: [['user', 'admin']] } },
  recipientId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_id' },
  type: { type: DataTypes.STRING(80), allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: true },
  dedupeKey: { type: DataTypes.STRING(200), allowNull: true, field: 'dedupe_key' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
}, {
  tableName: 'notifications', underscored: true, timestamps: true, freezeTableName: true,
  indexes: [
    { fields: ['recipient_type', 'recipient_id', 'read_at'], name: 'notifications_recipient_read_idx' },
    { unique: true, fields: ['recipient_type', 'recipient_id', 'dedupe_key'], name: 'notifications_dedupe_idx' },
  ],
});
