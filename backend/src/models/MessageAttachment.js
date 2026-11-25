const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { MAX_EXTRACTED_CHARS } = require('../config/fileUploads');
const { normalizeFilenameEncoding } = require('../utils/filenameEncoding');

// Pièce jointe d'un message de conversation.
// Table dédiée plutôt qu'un champ du JSONB Conversation.messages : il faut
// pouvoir indexer, purger et rattacher les fichiers indépendamment du message.
const MessageAttachment = sequelize.define('MessageAttachment', {
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
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'conversation_id',
  },
  // Identifiant du message dans Conversation.messages (JSONB).
  // Nul tant que la pièce n'est pas rattachée : sert aussi d'anti-rejeu,
  // une pièce déjà utilisée ne peut plus l'être une seconde fois.
  messageId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'message_id',
  },
  storageKey: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'storage_key',
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name',
    get() {
      const value = this.getDataValue('originalName');
      return value == null ? value : normalizeFilenameEncoding(value);
    },
    set(value) {
      this.setDataValue('originalName', value == null ? value : normalizeFilenameEncoding(value));
    },
  },
  mimeType: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'mime_type',
  },
  sizeBytes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'size_bytes',
  },
  category: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['image', 'document']] },
  },
  extractionStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    field: 'extraction_status',
    validate: { isIn: [['pending', 'done', 'empty', 'error']] },
  },
  extractionMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'extraction_method',
  },
  // Texte extrait, borné : c'est lui qui alimente le contexte du modèle.
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'extracted_text',
    set(value) {
      // setDataValue attend le nom de l'attribut, pas celui de la colonne.
      this.setDataValue('extractedText', value ? String(value).slice(0, MAX_EXTRACTED_CHARS) : null);
    },
  },
}, {
  tableName: 'message_attachments',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'], name: 'message_attachments_tenant_id_idx' },
    { fields: ['conversation_id'], name: 'message_attachments_conversation_id_idx' },
    { fields: ['message_id'], name: 'message_attachments_message_id_idx' },
  ],
});

/** Métadonnées sûres à exposer au client : jamais la clé de stockage. */
MessageAttachment.prototype.toPublicJSON = function toPublicJSON() {
  return {
    id: this.id,
    name: this.originalName,
    mimeType: this.mimeType,
    size: this.sizeBytes,
    category: this.category,
  };
};

module.exports = MessageAttachment;
