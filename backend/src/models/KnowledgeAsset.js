const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { normalizeFilenameEncoding } = require('../utils/filenameEncoding');

const KnowledgeAsset = sequelize.define('KnowledgeAsset', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  knowledgeBaseId: { type: DataTypes.UUID, allowNull: true, field: 'knowledge_base_id' },
  collectionId: { type: DataTypes.UUID, allowNull: true, field: 'collection_id' },
  storageKey: { type: DataTypes.STRING(500), allowNull: false, field: 'storage_key' },
  originalName: {
    type: DataTypes.STRING(255), allowNull: false, field: 'original_name',
    get() {
      const value = this.getDataValue('originalName');
      return value == null ? value : normalizeFilenameEncoding(value);
    },
    set(value) {
      this.setDataValue('originalName', value == null ? value : normalizeFilenameEncoding(value));
    },
  },
  mimeType: { type: DataTypes.STRING(150), allowNull: false, field: 'mime_type' },
  sizeBytes: { type: DataTypes.INTEGER, allowNull: false, field: 'size_bytes' },
  assetType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'image', field: 'asset_type' },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'knowledge_assets', timestamps: true, underscored: true, freezeTableName: true,
});

KnowledgeAsset.prototype.toPublicJSON = function toPublicJSON() {
  return {
    id: this.id, name: this.originalName, mimeType: this.mimeType,
    size: this.sizeBytes, assetType: this.assetType, metadata: this.metadata,
  };
};

module.exports = KnowledgeAsset;
