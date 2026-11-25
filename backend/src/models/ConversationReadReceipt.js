const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ConversationReadReceipt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  lastReadAt: { type: DataTypes.DATE, allowNull: false, field: 'last_read_at' },
}, { tableName: 'conversation_read_receipts', timestamps: true, underscored: true, freezeTableName: true });
