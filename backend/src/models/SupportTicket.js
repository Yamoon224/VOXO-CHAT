const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const STATUSES = ['open', 'pending', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high'];
const TYPES = ['general', 'plan_change'];
const REASONS = ['billing', 'account_access', 'chatbot_setup', 'integrations', 'documents', 'technical_issue', 'other'];

/**
 * Demande d'assistance d'une entreprise cliente vers la plateforme.
 *
 * À ne pas confondre avec `CommercialRequest`, qui va dans l'autre sens : un
 * client final vers l'entreprise, capturé par son chatbot.
 */
const SupportTicket = sequelize.define('SupportTicket', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'Tenant', key: 'id' },
  },
  openedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'opened_by_user_id',
    references: { model: 'User', key: 'id' },
  },
  subject: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: { notEmpty: true, len: [3, 120] },
  },
  // Énumérations validées, contrairement à `ConversationAlert` dont les
  // colonnes de statut sont des chaînes libres.
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'open',
    validate: { isIn: [STATUSES] },
  },
  priority: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'normal',
    validate: { isIn: [PRIORITIES] },
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'general',
    validate: { isIn: [TYPES] },
  },
  requestedPlan: { type: DataTypes.STRING(20), allowNull: true, field: 'requested_plan' },
  requestNote: { type: DataTypes.TEXT, allowNull: true, field: 'request_note' },
  reason: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'other', validate: { isIn: [REASONS] } },
  otherReason: { type: DataTypes.STRING(120), allowNull: true, field: 'other_reason' },
  assignedAdminId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_admin_id',
    references: { model: 'admin_users', key: 'id' },
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'last_message_at',
  },
  resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
}, {
  tableName: 'support_tickets',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  // Déclarés ici ET dans la migration : `ConversationAlert` ne les portait que
  // dans la migration, ce qui rend le modèle trompeur à la lecture.
  indexes: [
    { fields: ['status', 'last_message_at'], name: 'support_tickets_inbox_idx' },
    { fields: ['tenant_id'], name: 'support_tickets_tenant_idx' },
    { fields: ['assigned_admin_id'], name: 'support_tickets_assignee_idx' },
    {
      fields: ['tenant_id', 'type', 'status'], unique: true,
      where: { type: 'plan_change', status: ['open', 'pending'] },
      name: 'support_tickets_plan_change_active_idx',
    },
  ],
});

module.exports = SupportTicket;
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.TYPES = TYPES;
module.exports.REASONS = REASONS;
