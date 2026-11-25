const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeChunk = sequelize.define('KnowledgeChunk', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
  },
  knowledgeBaseId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'knowledge_base_id',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  chunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'chunk_index',
  },
  contentHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'content_hash',
  },
  embeddingModel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'embedding_model',
  },
  embeddingStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    field: 'embedding_status',
  },
  embeddingError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'embedding_error',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'knowledge_chunks',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'], name: 'knowledge_chunks_tenant_id_idx' },
    { fields: ['knowledge_base_id'], name: 'knowledge_chunks_knowledge_base_id_idx' },
    { fields: ['embedding_status'], name: 'knowledge_chunks_embedding_status_idx' },
  ],
});

module.exports = KnowledgeChunk;
