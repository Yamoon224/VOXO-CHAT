const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IntegrationSyncJob = sequelize.define('IntegrationSyncJob', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  connectorId: { type: DataTypes.UUID, allowNull: false, field: 'connector_id' },
  status: { type: DataTypes.ENUM('running', 'completed', 'failed'), defaultValue: 'running' },
  summary: { type: DataTypes.JSONB, defaultValue: {} },
  error: { type: DataTypes.STRING(500), allowNull: true },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'started_at' },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
}, { timestamps: true, underscored: true, freezeTableName: true,
  indexes: [{ fields: ['tenant_id', 'connector_id', 'created_at'], name: 'integration_sync_job_connector_idx' }] });

module.exports = IntegrationSyncJob;
