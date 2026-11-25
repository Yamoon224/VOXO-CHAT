const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ConversationAlert', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
  reason: { type: DataTypes.STRING(24), allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'open' },
  emailStatus: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending', field: 'email_status' },
}, { tableName: 'conversation_alerts', timestamps: true, underscored: true, freezeTableName: true });
