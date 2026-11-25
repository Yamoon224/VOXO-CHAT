const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ConversationLabel', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(40), allowNull: false },
  color: { type: DataTypes.STRING(16), allowNull: false },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
}, { tableName: 'conversation_labels', timestamps: true, underscored: true, freezeTableName: true });
