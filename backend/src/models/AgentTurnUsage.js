const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AgentTurnUsage = sequelize.define('AgentTurnUsage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  conversationId: { type: DataTypes.UUID, allowNull: true, field: 'conversation_id' },
  tokensUsed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'tokens_used' },
  estimatedTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'estimated_tokens' },
  llmCalls: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'llm_calls' },
  toolCalls: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'tool_calls' },
  stopReason: { type: DataTypes.STRING(40), allowNull: false, field: 'stop_reason' },
  correctionSkipped: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'correction_skipped' },
}, { tableName: 'agent_turn_usage', timestamps: true, underscored: true, freezeTableName: true, indexes: [
  { fields: ['tenant_id', 'created_at'], name: 'agent_turn_usage_tenant_created_idx' },
] });

module.exports = AgentTurnUsage;
