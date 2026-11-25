const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Paramètres éditables d'un forfait : prix, limites, caractéristiques.
 *
 * `name` reprend une valeur de l'ENUM `Tenant.subscription_plan`, qui reste la
 * référence : cette table ne crée pas de forfaits, elle paramètre ceux qui
 * existent. Pas de clé étrangère, donc, ni de suppression.
 */
const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  label: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: { notEmpty: true, len: [2, 40] },
  },
  // En centimes : jamais un flottant pour de la monnaie.
  priceAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'price_amount',
    validate: { min: 0 },
  },
  priceCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
    field: 'price_currency',
  },
  prices: { type: DataTypes.JSONB, allowNull: false, defaultValue: { EUR: null, USD: null, XOF: null } },
  billingInterval: {
    type: DataTypes.STRING(12), allowNull: false, defaultValue: 'monthly', field: 'billing_interval',
    validate: { isIn: [['monthly', 'yearly']] },
  },
  creditsPerCycle: {
    type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'credits_per_cycle', validate: { min: 0 },
  },
  allowVisitorAttachments: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'allow_visitor_attachments' },
  allowAgentAttachments: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'allow_agent_attachments' },
  isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_archived' },
  // NULL = illimité sur toutes les limites ci-dessous.
  messagesPerMonth: {
    type: DataTypes.INTEGER, allowNull: true, field: 'messages_per_month', validate: { min: 0 },
  },
  messagesPerDay: {
    type: DataTypes.INTEGER, allowNull: true, field: 'messages_per_day', validate: { min: 0 },
  },
  maxUsers: {
    type: DataTypes.INTEGER, allowNull: true, field: 'max_users', validate: { min: 1 },
  },
  activeDocuments: {
    type: DataTypes.INTEGER, allowNull: true, field: 'active_documents', validate: { min: 0 },
  },
  features: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  sortOrder: {
    type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order',
  },
}, {
  tableName: 'plans',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
});

module.exports = Plan;
