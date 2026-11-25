const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AUTHOR_TYPES = ['tenant', 'admin'];
const ROLES = ['message', 'internal_note'];

/**
 * Message d'un fil de support.
 *
 * Table dédiée plutôt qu'un tableau JSONB comme `Conversation.messages` : un
 * fil de support se pagine, se compte et se filtre par rôle, ce qu'un JSONB
 * rend coûteux.
 */
const SupportMessage = sequelize.define('SupportMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ticket_id',
    references: { model: 'support_tickets', key: 'id' },
  },
  // Les identités tenant et admin vivent dans deux espaces distincts : pas de
  // clé étrangère possible sur `authorId`, d'où ce discriminant.
  authorType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    field: 'author_type',
    validate: { isIn: [AUTHOR_TYPES] },
  },
  authorId: { type: DataTypes.UUID, allowNull: true, field: 'author_id' },
  // Figé à l'écriture : le fil doit rester lisible même si le compte auteur
  // est supprimé plus tard.
  authorName: {
    type: DataTypes.STRING(120),
    allowNull: false,
    field: 'author_name',
    validate: { notEmpty: true },
  },
  /**
   * `internal_note` est réservé aux administrateurs et ne doit JAMAIS être
   * renvoyé au client. Le filtrage se fait dans la requête (`role: 'message'`),
   * jamais par omission à l'affichage.
   */
  role: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'message',
    validate: { isIn: [ROLES] },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 5000] },
  },
  // Idempotence : couplé à l'index unique `(ticket_id, client_message_id)`,
  // un renvoi après échec réseau ne duplique pas le message.
  clientMessageId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'client_message_id',
  },
}, {
  tableName: 'support_messages',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['ticket_id', 'created_at'], name: 'support_messages_thread_idx' },
    {
      fields: ['ticket_id', 'client_message_id'],
      unique: true,
      name: 'support_messages_idempotency_idx',
    },
  ],
});

module.exports = SupportMessage;
module.exports.AUTHOR_TYPES = AUTHOR_TYPES;
module.exports.ROLES = ROLES;
