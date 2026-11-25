const { AppError } = require('../middleware/errorMiddleware');
const tenantService = require('./adminTenantService');
const tenantDeletionService = require('./tenantDeletionService');
const emailService = require('./emailService');

/**
 * Actions d'un administrateur de la plateforme sur une entreprise cliente.
 *
 * Bloquer se résume à `isActive: false` : le middleware d'authentification, la
 * résolution de tenant, le widget public, le WebSocket et les webhooks entrants
 * filtrent tous sur ce drapeau, et les JWT déjà émis meurent d'eux-mêmes
 * puisque l'utilisateur est rechargé à chaque requête.
 */
class AdminTenantStatusService {
  /** Sequelize ne détecte pas une mutation interne d'un JSONB : on réassigne. */
  cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings || {}));
  }

  /**
   * Coupe les webhooks chez Telegram/WhatsApp puis reflète l'état réel dans les
   * réglages. Sans cette seconde étape, le tableau de bord du client
   * continuerait d'afficher des canaux « actifs » qui ne reçoivent plus rien.
   */
  async disconnectChannels(tenant) {
    await tenantDeletionService.cleanupExternalChannels(tenant);

    const settings = this.cloneSettings(tenant.settings);
    if (!settings.channels) return settings;

    ['telegram', 'whatsapp'].forEach((channel) => {
      if (settings.channels[channel]) settings.channels[channel].webhookActive = false;
    });
    return settings;
  }

  async notifyOwner(tenant, template) {
    const owner = await tenantService.findOwner(tenant.id);
    if (!owner) return false;

    // Meilleur effort : une panne du fournisseur d'email ne doit jamais
    // empêcher un blocage de prendre effet.
    return emailService.sendBestEffort({
      to: owner.email,
      template,
      data: { firstName: owner.firstName, tenantName: tenant.name },
      locale: owner.preferredLocale || 'fr',
    });
  }

  async setStatus({ tenantId, isActive }) {
    const tenant = await tenantService.findTenantOrFail(tenantId);

    if (tenant.isActive === isActive) {
      throw new AppError(
        isActive ? 'Cette entreprise est déjà active' : 'Cette entreprise est déjà bloquée',
        409,
        { code: isActive ? 'TENANT_ALREADY_ACTIVE' : 'TENANT_ALREADY_INACTIVE' }
      );
    }

    if (isActive) {
      await tenant.update({ isActive: true });
      await this.notifyOwner(tenant, 'tenantReactivated');
      return tenantService.getTenantDetail(tenant.id);
    }

    // Les canaux d'abord, comme à la suppression : laisser un bot répondre au
    // nom d'une entreprise bloquée serait incohérent.
    const settings = await this.disconnectChannels(tenant);
    await tenant.update({ isActive: false, settings });
    await this.notifyOwner(tenant, 'tenantSuspended');
    return tenantService.getTenantDetail(tenant.id);
  }

  /**
   * Changer le forfait est le levier de restriction réellement appliqué :
   * `quotaService` en dérive les limites, et les caractéristiques suivent
   * d'elles-mêmes puisqu'elles sont calculées à la lecture depuis le forfait.
   */
  async updatePlan({ tenantId, subscriptionPlan, subscriptionExpiresAt }) {
    const tenant = await tenantService.findTenantOrFail(tenantId);

    const { Plan } = require('../models');
    const plan = await Plan.findOne({ where: { name: subscriptionPlan, isArchived: false } });
    if (!plan) {
      throw new AppError('Forfait inconnu', 400, { code: 'TENANT_PLAN_UNKNOWN' });
    }

    const expiryChanged = subscriptionExpiresAt !== undefined
      && String(tenant.subscriptionExpiresAt ?? '') !== String(subscriptionExpiresAt ?? '');
    if (tenant.subscriptionPlan === subscriptionPlan && !expiryChanged) {
      throw new AppError('Cette entreprise a déjà ce forfait', 409, {
        code: 'TENANT_PLAN_UNCHANGED',
      });
    }

    await tenant.update({
      subscriptionPlan,
      ...(subscriptionExpiresAt !== undefined && { subscriptionExpiresAt }),
    });
    return tenantService.getTenantDetail(tenant.id);
  }
}

module.exports = new AdminTenantStatusService();
