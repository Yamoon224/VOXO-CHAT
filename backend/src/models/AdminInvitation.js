const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminInvitation = sequelize.define('AdminInvitation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'role_id',
    references: { model: 'admin_roles', key: 'id' },
  },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'accepted', 'revoked']] },
  },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  invitedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'invited_by',
    references: { model: 'admin_users', key: 'id' },
  },
  acceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'accepted_at' },
  revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
  locale: {
    type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr',
    validate: { isIn: [['fr', 'en']] },
  },
}, {
  tableName: 'admin_invitations',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['status'], name: 'admin_invitations_status_idx' },
    {
      fields: ['email'],
      unique: true,
      where: { status: 'pending' },
      name: 'admin_invitations_unique_pending_email_idx',
    },
  ],
});

module.exports = AdminInvitation;
