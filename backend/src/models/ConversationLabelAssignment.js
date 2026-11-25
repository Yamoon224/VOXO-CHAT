const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ConversationLabelAssignment', {
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'conversation_id' },
  labelId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'label_id' },
}, { tableName: 'conversation_label_assignments', timestamps: true, underscored: true, freezeTableName: true });
