const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { computeEffectivePermissions } = require('../config/permissions');

const TeamInvitation = sequelize.define('TeamInvitation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'Tenant', key: 'id' },
  },
  email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['admin', 'user']] },
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
    references: { model: 'User', key: 'id' },
  },
  acceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'accepted_at' },
  revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
  locale: {
    type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr',
    validate: { isIn: [['fr', 'en']] },
  },
  // Accès choisis à l'invitation, recopiés sur le compte à l'acceptation.
  permissionOverrides: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'permission_overrides',
  },
}, {
  tableName: 'team_invitations',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id', 'status'], name: 'team_invitations_tenant_status_idx' },
    { fields: ['tenant_id', 'email'], name: 'team_invitations_tenant_email_idx' },
    {
      fields: ['tenant_id', 'email'],
      unique: true,
      where: { status: 'pending' },
      name: 'team_invitations_unique_pending_email_idx',
    },
  ],
});

// Mêmes accès effectifs qu'un membre : l'invité voit d'avance ce qu'il aura.
TeamInvitation.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.permissions = computeEffectivePermissions(this);
  return values;
};

module.exports = TeamInvitation;
