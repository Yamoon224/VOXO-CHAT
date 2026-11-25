const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TenantUsage = sequelize.define('TenantUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'Tenant',
      key: 'id',
    },
  },
  // `message` compte au mois, `message_daily` au jour. Deux types distincts
  // plutôt qu'un seul : l'index unique porte sur (tenant, type, période), les
  // deux compteurs coexistent donc sans jamais entrer en conflit.
  resourceType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'resource_type',
    validate: {
      isIn: [['message', 'message_daily']],
    },
  },
  periodKey: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'period_key',
    validate: {
      // « YYYY-MM » (mensuel) ou « YYYY-MM-DD » (journalier).
      is: /^\d{4}-\d{2}(-\d{2})?$/,
    },
  },
  used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'tenant_usage',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['tenant_id', 'resource_type', 'period_key'],
      unique: true,
      name: 'tenant_usage_unique_period_idx',
    },
    {
      fields: ['tenant_id'],
      name: 'tenant_usage_tenant_id_idx',
    },
  ],
});

module.exports = TenantUsage;
