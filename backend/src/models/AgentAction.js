const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AgentAction = sequelize.define('AgentAction', {
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
  name: {
    type: DataTypes.STRING(64),
    allowNull: false,
    validate: {
      is: /^[a-z][a-z0-9_]{0,63}$/,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['GET', 'POST', 'PUT', 'PATCH', 'DELETE']],
    },
  },
  endpointUrl: {
    type: DataTypes.STRING(2048),
    allowNull: false,
    field: 'endpoint_url',
  },
  parametersSchema: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'parameters_schema',
  },
  headersTemplate: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'headers_template',
  },
  // Chiffré (AES-256-GCM) par `cryptoUtils` avant écriture — jamais assigné en clair.
  authSecretEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'auth_secret_encrypted',
  },
  timeoutMs: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5000,
    field: 'timeout_ms',
    validate: {
      min: 500,
      max: 30000,
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'agent_actions',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      fields: ['tenant_id', 'name'],
      unique: true,
      name: 'agent_action_tenant_name_unique',
    },
    {
      fields: ['tenant_id'],
      name: 'agent_actions_tenant_id_idx',
    },
  ],
});

module.exports = AgentAction;
