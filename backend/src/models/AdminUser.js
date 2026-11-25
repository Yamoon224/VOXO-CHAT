const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { computeEffectivePermissions } = require('../config/adminPermissions');

const AdminUser = sequelize.define('AdminUser', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: [6, 255] },
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'first_name',
    validate: { notEmpty: true, len: [1, 50] },
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'last_name',
    validate: { notEmpty: true, len: [1, 50] },
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'role_id',
    references: { model: 'admin_roles', key: 'id' },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
  preferredLocale: {
    type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr', field: 'preferred_locale',
    validate: { isIn: [['fr', 'en']] },
  },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, {
  tableName: 'admin_users',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  paranoid: true,
  indexes: [
    {
      fields: ['email'],
      unique: true,
      name: 'admin_users_email_unique_idx',
      where: { deleted_at: null },
    },
    { fields: ['role_id'], name: 'admin_users_role_id_idx' },
    { fields: ['is_active'], name: 'admin_users_is_active_idx' },
  ],
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }
    },
  },
});

AdminUser.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Les accès effectifs sont dérivés du rôle : toute requête qui sérialise un
// AdminUser doit donc charger `role`, sinon les permissions ressortent vides.
AdminUser.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  values.permissions = computeEffectivePermissions(this);
  return values;
};

module.exports = AdminUser;
