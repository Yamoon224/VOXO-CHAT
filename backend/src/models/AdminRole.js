const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminRole = sequelize.define('AdminRole', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true, len: [2, 40] },
  },
  // Le rôle système (super_admin) est seedé par migration : il détient toutes
  // les permissions par calcul et reste le seul à pouvoir définir les autres.
  isSystem: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_system',
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'admin_roles',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
});

module.exports = AdminRole;
