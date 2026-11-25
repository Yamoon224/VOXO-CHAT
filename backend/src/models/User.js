// src/models/User.js (VERSION CORRIGÉE)
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { computeEffectivePermissions } = require('../config/permissions');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'Tenant',
      key: 'id',
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255],
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name',
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name',
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'user'),
    defaultValue: 'user',
  },
  // Uniquement les écarts au préréglage du rôle ; `{}` = préréglage.
  // Le niveau effectif se calcule à la lecture (voir toJSON).
  permissionOverrides: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'permission_overrides',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at',
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verified_at',
  },
  // Nouvelle adresse en attente de validation : elle ne remplace `email`
  // qu'une fois le lien confirmé, pour ne jamais verrouiller le compte.
  pendingEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'pending_email',
    validate: {
      isEmail: true,
    },
  },
  preferredLocale: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'fr',
    field: 'preferred_locale',
    validate: { isIn: [['fr', 'en']] },
  },
  avatarStorageKey: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'avatar_storage_key',
  },
  // Soft delete : la ligne est conservée 30 jours puis purgée définitivement.
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  paranoid: true,
  // Un compte supprimé ne réserve plus son email : les index d'unicité sont
  // partiels (`WHERE deleted_at IS NULL`), cf. migration 20260806000200.
  indexes: [
    {
      fields: ['tenant_id', 'email'],
      unique: true,
      name: 'user_tenant_email_unique',
      where: { deleted_at: null }
    },
    {
      fields: ['tenant_id'],
      name: 'user_tenant_id_idx'
    },
    {
      fields: ['email'],
      name: 'user_email_unique_idx',
      unique: true,
      where: { deleted_at: null }
    },
    {
      fields: ['is_active'],
      name: 'user_is_active_idx'
    },
    {
      fields: ['deleted_at'],
      name: 'user_deleted_at_idx'
    },
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

// Méthodes d'instance
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  // Les accès effectifs voyagent avec l'utilisateur dans toutes les réponses
  // (connexion, profil, liste des membres) : le frontend n'a rien à recalculer.
  values.permissions = computeEffectivePermissions(this);
  return values;
};

module.exports = User;
