const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IntegrationConnector = sequelize.define('IntegrationConnector', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  provider: { type: DataTypes.ENUM('wordpress', 'microsoft365'), allowNull: false },
  status: { type: DataTypes.ENUM('connected', 'syncing', 'error', 'disconnected'), defaultValue: 'disconnected' },
  config: { type: DataTypes.JSONB, defaultValue: {} },
  credentials: { type: DataTypes.TEXT, allowNull: true },
  syncFrequency: { type: DataTypes.ENUM('manual', 'daily', 'weekly'), defaultValue: 'daily', field: 'sync_frequency' },
  lastSyncedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_synced_at' },
  lastError: { type: DataTypes.STRING(500), allowNull: true, field: 'last_error' },
}, { timestamps: true, underscored: true, freezeTableName: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'provider'], name: 'integration_connector_tenant_provider_idx' }] });

module.exports = IntegrationConnector;
