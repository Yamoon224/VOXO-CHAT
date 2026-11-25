// src/models/Tenant.js (VERSION CORRIGÉE)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255],
    },
  },
  // Pas de `unique: true` ici : l'unicité est portée par un index partiel
  // (`WHERE domain IS NOT NULL AND deleted_at IS NULL`) déclaré plus bas, sinon
  // un tenant supprimé garderait son domaine réservé.
  domain: {
    type: DataTypes.STRING,
    allowNull: true, // Permettre null
    validate: {
      isUrl: {
        msg: 'Domain must be a valid URL'
      },
      // Validation conditionnelle : si domain est fourni, il doit être valide
      isValidDomain(value) {
        if (value && value.trim() === '') {
          throw new Error('Domain cannot be empty string, use null instead');
        }
      }
    },
  },
  // Même raison que `domain` : index partiel plutôt que contrainte globale.
  subdomain: {
    type: DataTypes.STRING,
    allowNull: true, // Permettre null
    validate: {
      isAlphanumeric: {
        msg: 'Subdomain must contain only letters and numbers'
      },
      len: [3, 50],
      // Validation conditionnelle : si subdomain est fourni, il doit être valide
      isValidSubdomain(value) {
        if (value && value.trim() === '') {
          throw new Error('Subdomain cannot be empty string, use null instead');
        }
      }
    },
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      chatbot: {
        name: 'Assistant',
        welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
        localizedContent: {
          fr: { welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?', initialQuestions: [] },
          en: { welcomeMessage: 'Hello! How can I help you?', initialQuestions: [] },
        },
        // Voir TONE_PRESETS dans services/chatPromptBuilder.js pour les valeurs acceptées.
        tone: 'chaleureux',
        features: {
          autoResponseSuggestions: true,
        },
        theme: {
          primaryColor: '#007bff',
          textColor: '#333333',
          position: 'bottom-right',
        },
      },
      features: {
        leadGeneration: true,
        analytics: true,
        customBranding: false,
      },
      channels: {
        telegram: {
          botToken: null,
          botUsername: null,
          webhookActive: false,
          webhookSecret: null,
        },
        whatsapp: {
          provider: 'meta',
          sessionId: null,
          phoneNumberId: null,
          accessToken: null,
          verifyToken: null,
          webhookSecret: null,
          webhookActive: false,
          sessionStatus: null,
          lastWebhookAt: null,
          lastError: null,
        },
      },
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  allowedDomains: { type: DataTypes.JSONB, defaultValue: [], field: 'allowed_domains' },
  enforceDomains: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'enforce_domains' },
  // Pendant mobile des domaines : identifiants d'application (bundle id / package name).
  allowedAppIds: { type: DataTypes.JSONB, defaultValue: [], field: 'allowed_app_ids' },
  enforceAppIds: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'enforce_app_ids' },
  // Notifications push mobiles. `mobilePush` : réglages NON secrets (activation, identifiants publics
  // comme keyId/teamId/bundleId). `mobilePushSecrets` : compte de service FCM et clé APNs, chiffrés
  // (integrationCryptoService), jamais renvoyés par l'API.
  mobilePush: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'mobile_push' },
  mobilePushSecrets: { type: DataTypes.TEXT, allowNull: true, field: 'mobile_push_secrets' },

  subscriptionPlan: {
    type: DataTypes.STRING(40),
    defaultValue: 'free',
    field: 'subscription_plan',
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'subscription_expires_at',
  },
  // Soft delete : l'entreprise et son abonnement survivent 30 jours avant purge.
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
  hooks: {
    // Hook pour nettoyer les champs avant validation
    beforeValidate: (tenant) => {
      // Convertir les chaînes vides en null
      if (tenant.domain === '') {
        tenant.domain = null;
      }
      if (tenant.subdomain === '') {
        tenant.subdomain = null;
      }
    },
  },
  // Index partiels : un tenant supprimé ne réserve ni son domaine ni son
  // sous-domaine, cf. migration 20260806000200.
  indexes: [
    {
      fields: ['domain'],
      name: 'tenant_domain_idx',
      unique: true,
      where: {
        domain: { [require('sequelize').Op.ne]: null },
        deleted_at: null
      }
    },
    {
      fields: ['subdomain'],
      name: 'tenant_subdomain_idx',
      unique: true,
      where: {
        subdomain: { [require('sequelize').Op.ne]: null },
        deleted_at: null
      }
    },
    {
      fields: ['is_active'],
      name: 'tenant_is_active_idx'
    },
    {
      fields: ['subscription_plan'],
      name: 'tenant_subscription_plan_idx'
    },
    {
      fields: ['deleted_at'],
      name: 'tenant_deleted_at_idx'
    },
  ],
});

module.exports = Tenant;
