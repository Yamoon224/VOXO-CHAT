const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuthToken = sequelize.define('AuthToken', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'User', key: 'id' },
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['password_reset', 'email_verification']] },
  },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' },
}, {
  tableName: 'auth_tokens',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['user_id', 'type'], name: 'auth_tokens_user_type_idx' },
  ],
});

module.exports = AuthToken;
