const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ConversationPageVisit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
  messageId: { type: DataTypes.STRING(100), allowNull: false, field: 'message_id' },
  url: { type: DataTypes.STRING(2000), allowNull: false },
  visitedAt: { type: DataTypes.DATE, allowNull: false, field: 'visited_at' },
}, { tableName: 'conversation_page_visits', timestamps: true, underscored: true, freezeTableName: true });
