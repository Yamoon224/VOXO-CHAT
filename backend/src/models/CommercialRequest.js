const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('CommercialRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
  knowledgeBaseId: { type: DataTypes.UUID, allowNull: true, field: 'knowledge_base_id' },
  requestKey: { type: DataTypes.STRING(255), allowNull: false, field: 'request_key' },
  reason: { type: DataTypes.STRING(40), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: true },
  customerName: { type: DataTypes.STRING(150), allowNull: false, field: 'customer_name' },
  customerPhone: { type: DataTypes.STRING(50), allowNull: false, field: 'customer_phone' },
  customerEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'customer_email' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
  notificationStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'notification_status' },
  notifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'notified_at' },
  category: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'other', validate: { isIn: [['order', 'repair', 'other']] } },
  outcomeStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open', field: 'outcome_status', validate: { isIn: [['open', 'in_progress', 'successful', 'failed', 'cancelled']] } },
  resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
  resolutionReason: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_reason' },
  amount: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
}, {
  tableName: 'commercial_requests', timestamps: true, underscored: true, freezeTableName: true,
});
