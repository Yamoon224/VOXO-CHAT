// src/models/Conversation.js (VERSION CORRIGÉE)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
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
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'session_id',
    validate: {
      notEmpty: true,
    },
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true, // Peut être anonyme
    field: 'user_id',
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_name',
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_email',
  },
  messages: {
    type: DataTypes.JSONB,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Messages must be an array');
        }
      },
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'ended', 'escalated'),
    defaultValue: 'active',
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ended_at',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      userAgent: null,
      ipAddress: null,
      referrer: null,
      location: null,
    },
  },
  satisfactionRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'satisfaction_rating',
    validate: {
      min: 1,
      max: 5,
    },
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  priority: {
    type: DataTypes.STRING(16), allowNull: false, defaultValue: 'normal',
    validate: { isIn: [['normal', 'important', 'urgent', 'critical']] },
  },
  prioritySource: {
    type: DataTypes.STRING(16), allowNull: false, defaultValue: 'default', field: 'priority_source',
    validate: { isIn: [['default', 'ai', 'manual']] },
  },
  priorityReason: { type: DataTypes.STRING(500), allowNull: true, field: 'priority_reason' },
  priorityUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: 'priority_updated_at' },
  channel: {
    type: DataTypes.ENUM('web', 'telegram', 'whatsapp'),
    defaultValue: 'web',
  },
  externalUserId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'external_user_id',
  },
  handoffStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'ai', field: 'handoff_status' },
  handoffReason: { type: DataTypes.STRING(24), allowNull: true, field: 'handoff_reason' },
  assignedAgentId: { type: DataTypes.UUID, allowNull: true, field: 'assigned_agent_id' },
  handoffRequestedAt: { type: DataTypes.DATE, allowNull: true, field: 'handoff_requested_at' },
  humanTakenAt: { type: DataTypes.DATE, allowNull: true, field: 'human_taken_at' },
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { 
      fields: ['tenant_id'],
      name: 'conversation_tenant_id_idx'
    },
    { 
      fields: ['tenant_id', 'session_id'],
      name: 'conversation_tenant_session_idx'
    },
    {
      fields: ['channel', 'external_user_id'],
      name: 'conversation_channel_external_idx'
    },
    { 
      fields: ['status'],
      name: 'conversation_status_idx'
    },
    { 
      fields: ['created_at'],
      name: 'conversation_created_at_idx'
    },
  ],
});

module.exports = Conversation;
