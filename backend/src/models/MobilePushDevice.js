const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Jeton de notification d'un appareil, lié à UNE session de conversation à la fois.
const MobilePushDevice = sequelize.define('MobilePushDevice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: {
    type: DataTypes.UUID, allowNull: false, field: 'tenant_id', references: { model: 'Tenant', key: 'id' },
  },
  sessionId: { type: DataTypes.STRING(100), allowNull: false, field: 'session_id' },
  platform: { type: DataTypes.STRING(8), allowNull: false, validate: { isIn: [['fcm', 'apns']] } },
  token: { type: DataTypes.TEXT, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, field: 'token_hash' },
  locale: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr' },
  appId: { type: DataTypes.STRING(255), allowNull: true, field: 'app_id' },
  lastSeenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'last_seen_at' },
}, {
  tableName: 'mobile_push_devices',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'token_hash'], name: 'mobile_push_devices_tenant_token_unique' },
    { fields: ['tenant_id', 'session_id'], name: 'mobile_push_devices_tenant_session' },
  ],
});

module.exports = MobilePushDevice;
