// src/models/KnowledgeBase.js (VERSION CORRIGÉE)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeBase = sequelize.define('KnowledgeBase', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 500],
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sourceType: {
    type: DataTypes.ENUM('manual', 'upload', 'url', 'api'),
    defaultValue: 'manual',
    field: 'source_type',
  },
  sourceUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'source_url',
    validate: {
      isUrl: true,
    },
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  embedding: {
    type: DataTypes.TEXT, // Stockage des embeddings OpenAI
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'User',
      key: 'id',
    },
  },
  // Crawl de site à l'origine de cette connaissance (null si ajout manuel/fichier/URL isolée)
  crawlJobId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'crawl_job_id',
  },
  externalId: { type: DataTypes.STRING(255), allowNull: true, field: 'external_id' },
  sourceProvider: { type: DataTypes.STRING(50), allowNull: true, field: 'source_provider' },
  sourceUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: 'source_updated_at' },
  collectionId: { type: DataTypes.UUID, allowNull: true, field: 'collection_id' },
  itemType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'knowledge', field: 'item_type' },
  category: { type: DataTypes.STRING(150), allowNull: true },
  sku: { type: DataTypes.STRING(100), allowNull: true },
  priceAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'price_amount' },
  priceCurrency: { type: DataTypes.STRING(3), allowNull: true, field: 'price_currency' },
  priceMode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'fixed', field: 'price_mode' },
  stockStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'unknown', field: 'stock_status' },
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { 
      fields: ['tenant_id'],
      name: 'knowledge_tenant_id_idx'
    },
    { 
      fields: ['tenant_id', 'is_active'],
      name: 'knowledge_tenant_active_idx'
    },
    { 
      fields: ['source_type'],
      name: 'knowledge_source_type_idx'
    },
    { 
      fields: ['tags'], 
      using: 'gin',
      name: 'knowledge_tags_idx'
    },
    {
      fields: ['created_by'],
      name: 'knowledge_created_by_idx'
    },
  ],
});

module.exports = KnowledgeBase;
