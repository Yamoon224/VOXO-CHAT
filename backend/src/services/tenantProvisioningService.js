const { Op } = require('sequelize');
const { sequelize, Tenant, User } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

class TenantProvisioningService {
  normalizeOptional(value) {
    const trimmed = (value || '').trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * `features` est volontairement absent : les caractéristiques sont dérivées
   * du forfait à la lecture (`tenantFeatureFlags`), plus figées à l'inscription.
   */
  buildDefaultSettings(companyName) {
    return {
      chatbot: {
        name: `Assistant ${companyName}`,
        welcomeMessage: `Bonjour ! Je suis l'assistant virtuel de ${companyName}. `
          + 'Comment puis-je vous aider ?',
        localizedContent: {
          fr: {
            welcomeMessage: `Bonjour ! Je suis l'assistant virtuel de ${companyName}. Comment puis-je vous aider ?`,
            initialQuestions: [],
          },
          en: {
            welcomeMessage: `Hello! I am ${companyName}'s virtual assistant. How can I help you?`,
            initialQuestions: [],
          },
        },
        theme: {
          primaryColor: '#3b82f6',
          textColor: '#333333',
          position: 'bottom-right',
        },
      },
    };
  }

  /**
   * Un compte non confirmé n'est pas une impasse : il se débloque en demandant
   * un nouveau lien. Le distinguer permet à l'appelant d'orienter l'utilisateur
   * vers le renvoi plutôt que vers une correction impossible.
   */
  async findEmailConflict(email) {
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { pendingEmail: email }] },
    });
    if (!existingUser) return null;

    // `pendingEmail` renseigné : l'adresse est réservée par un changement en
    // attente sur un autre compte, il n'y a rien à confirmer ici.
    if (!existingUser.emailVerifiedAt && !existingUser.pendingEmail) {
      return {
        field: 'email',
        code: 'EMAIL_PENDING_VERIFICATION',
        message: 'Un compte existe déjà pour cet email mais n’a pas encore été confirmé. '
          + 'Demandez un nouveau lien de confirmation.',
      };
    }

    return {
      field: 'email',
      code: 'EMAIL_ALREADY_USED',
      message: 'Un compte existe déjà avec cet email. Connectez-vous, ou utilisez '
        + '« Mot de passe oublié » si vous ne vous en souvenez plus.',
    };
  }

  async findSubdomainConflict(subdomain) {
    if (!subdomain) return null;

    const existingTenant = await Tenant.findOne({ where: { subdomain } });
    if (!existingTenant) return null;

    return {
      field: 'subdomain',
      code: 'SUBDOMAIN_UNAVAILABLE',
      message: 'Ce sous-domaine n’est pas disponible',
    };
  }

  /**
   * Signale tous les conflits d'un coup : s'arrêter au premier obligerait
   * l'utilisateur à découvrir les suivants une soumission à la fois.
   * L'ordre porte la priorité, le premier conflit fournit code et message.
   */
  async assertAvailability({ email, subdomain }) {
    const conflicts = (await Promise.all([
      this.findEmailConflict(email),
      this.findSubdomainConflict(subdomain),
    ])).filter(Boolean);

    if (conflicts.length === 0) return;

    throw new AppError(conflicts[0].message, 409, {
      code: conflicts[0].code,
      details: { conflicts },
    });
  }

  /**
   * Crée l'entreprise et son premier utilisateur (propriétaire).
   * Le domaine ne fait pas partie de l'inscription : il se renseigne ensuite
   * dans les réglages de l'entreprise.
   */
  async createTenantWithOwner({
    companyName, subdomain, subscriptionPlan = 'free',
    firstName, lastName, email, password, preferredLocale = 'fr',
  }) {
    const cleanSubdomain = this.normalizeOptional(subdomain);

    await this.assertAvailability({ email, subdomain: cleanSubdomain });

    // Transaction obligatoire : sans elle, un échec sur la création de
    // l'utilisateur (course sur l'unicité de l'email) laisserait un tenant
    // orphelin déjà commité.
    return sequelize.transaction(async (transaction) => {
      const tenant = await Tenant.create({
        name: companyName,
        subscriptionPlan,
        settings: this.buildDefaultSettings(companyName),
        ...(cleanSubdomain && { subdomain: cleanSubdomain }),
      }, { transaction });

      const user = await User.create({
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        password, // Le hash est fait par le hook beforeCreate
        preferredLocale,
        role: 'owner',
      }, { transaction });

      return { tenant, user };
    });
  }
}

module.exports = new TenantProvisioningService();
