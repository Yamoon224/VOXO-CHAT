const { Op } = require('sequelize');
const {
  sequelize, TenantUsage, KnowledgeBase, User, TeamInvitation,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { DEFAULT_PLAN, isUnlimited } = require('../config/quotaPlans');
const planService = require('./planService');

const RESOURCE_LABELS = {
  message: 'messages mensuels',
  message_daily: 'messages quotidiens',
  document: 'documents actifs',
  member: 'utilisateurs',
};

class QuotaService {
  /** Clé du compteur mensuel : « YYYY-MM », en UTC. */
  getCurrentPeriodKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
  }

  /**
   * Clé du compteur journalier : « YYYY-MM-DD », en UTC comme le mensuel.
   * La remise à zéro a donc lieu à minuit UTC, pas à minuit local.
   */
  getCurrentDayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  buildQuotaError({ resource, plan, limit, used }) {
    const remaining = Math.max(limit - used, 0);
    const label = RESOURCE_LABELS[resource] || resource;
    const message = `Quota ${label} atteint pour le plan ${plan}. `
      + 'Passez à un forfait supérieur pour continuer.';

    return new AppError(message, 403, {
      code: 'QUOTA_EXCEEDED',
      details: { resource, plan, limit, used, remaining },
    });
  }

  /**
   * Forfait effectif. Point UNIQUE d'application de l'échéance : un abonnement
   * expiré retombe sur le forfait par défaut, sans quoi un client garderait
   * indéfiniment les limites qu'il ne paie plus.
   */
  getPlanName(tenant) {
    const plan = tenant?.subscriptionPlan || DEFAULT_PLAN;
    const expiresAt = tenant?.subscriptionExpiresAt;
    if (expiresAt && new Date(expiresAt) <= new Date()) return DEFAULT_PLAN;
    return plan;
  }

  /** Asynchrone depuis que les limites vivent en base (voir planService). */
  async getPlanLimits(tenant) {
    return planService.getLimits(this.getPlanName(tenant));
  }

  async getUsage(tenantId, resourceType, periodKey) {
    const usage = await TenantUsage.findOne({
      where: { tenantId, resourceType, periodKey },
    });
    return usage?.used || 0;
  }

  async getMessageUsage(tenantId, periodKey = this.getCurrentPeriodKey()) {
    return this.getUsage(tenantId, 'message', periodKey);
  }

  async getDailyMessageUsage(tenantId, dayKey = this.getCurrentDayKey()) {
    return this.getUsage(tenantId, 'message_daily', dayKey);
  }

  async getActiveDocumentUsage(tenantId) {
    return KnowledgeBase.count({ where: { tenantId, isActive: true } });
  }

  /**
   * Sièges occupés : membres actifs + invitations encore valables. Compter les
   * invitations est indispensable — sans cela, N invitations envoyées d'un coup
   * franchiraient toutes la limite au moment de leur acceptation.
   */
  async getMemberUsage(tenantId, options = {}) {
    const [members, invitations] = await Promise.all([
      User.count({ where: { tenantId, isActive: true }, ...options }),
      TeamInvitation.count({
        where: { tenantId, status: 'pending', expiresAt: { [Op.gt]: new Date() } },
        ...options,
      }),
    ]);
    return members + invitations;
  }

  formatUsage(used, limit) {
    return {
      used,
      limit,
      remaining: isUnlimited(limit) ? null : Math.max(limit - used, 0),
      unlimited: isUnlimited(limit),
    };
  }

  async getQuotaStatus(tenant) {
    const plan = this.getPlanName(tenant);
    const limits = await this.getPlanLimits(tenant);
    const periodKey = this.getCurrentPeriodKey();
    const dayKey = this.getCurrentDayKey();

    const [messagesUsed, dailyUsed, documentsUsed, membersUsed] = await Promise.all([
      this.getMessageUsage(tenant.id, periodKey),
      this.getDailyMessageUsage(tenant.id, dayKey),
      this.getActiveDocumentUsage(tenant.id),
      this.getMemberUsage(tenant.id),
    ]);

    return {
      plan,
      periodKey,
      dayKey,
      messages: this.formatUsage(messagesUsed, limits.messagesPerMonth),
      messagesDaily: this.formatUsage(dailyUsed, limits.messagesPerDay),
      documents: this.formatUsage(documentsUsed, limits.activeDocuments),
      members: this.formatUsage(membersUsed, limits.maxUsers),
    };
  }

  /**
   * Vérifie les limites mensuelle ET journalière. Le court-circuit « illimité »
   * est appliqué limite par limite : un forfait au mensuel illimité doit rester
   * soumis à son éventuel plafond quotidien.
   */
  async assertCanSendMessage(tenant, amount = 1) {
    const plan = this.getPlanName(tenant);
    const limits = await this.getPlanLimits(tenant);

    if (amount <= 0) return this.formatUsage(0, limits.messagesPerMonth);

    const monthly = await this.assertLimit({
      tenantId: tenant.id,
      resource: 'message',
      periodKey: this.getCurrentPeriodKey(),
      limit: limits.messagesPerMonth,
      plan,
      amount,
    });

    await this.assertLimit({
      tenantId: tenant.id,
      resource: 'message_daily',
      periodKey: this.getCurrentDayKey(),
      limit: limits.messagesPerDay,
      plan,
      amount,
    });

    return monthly;
  }

  async assertLimit({ tenantId, resource, periodKey, limit, plan, amount }) {
    if (isUnlimited(limit)) return this.formatUsage(0, limit);

    const used = await this.getUsage(tenantId, resource, periodKey);
    if (used + amount > limit) {
      throw this.buildQuotaError({ resource, plan, limit, used });
    }
    return this.formatUsage(used, limit);
  }

  /**
   * Incrémente les deux compteurs dans UNE transaction.
   *
   * L'upsert atomique remplace l'ancien findOrCreate/increment/findByPk : il
   * supprime la course entre deux messages simultanés, divise les allers-retours
   * par trois et rend inutile le rattrapage d'erreur d'unicité. La transaction
   * garantit qu'un incident ne laisse jamais le journalier et le mensuel
   * désynchronisés.
   */
  async incrementMessageUsage(tenantId, amount = 1) {
    const monthly = await sequelize.transaction(async (transaction) => {
      const [monthly] = await Promise.all([
        this.upsertUsage(tenantId, 'message', this.getCurrentPeriodKey(), amount, transaction),
        this.upsertUsage(tenantId, 'message_daily', this.getCurrentDayKey(), amount, transaction),
      ]);
      return monthly;
    });
    require('./quotaNotificationService').notifyMessageThreshold(tenantId, monthly, this.getCurrentPeriodKey());
    return monthly;
  }

  async upsertUsage(tenantId, resourceType, periodKey, amount, transaction) {
    const [rows] = await sequelize.query(
      `INSERT INTO tenant_usage (id, tenant_id, resource_type, period_key, used, created_at, updated_at)
       VALUES (gen_random_uuid(), :tenantId, :resourceType, :periodKey, :amount, NOW(), NOW())
       ON CONFLICT (tenant_id, resource_type, period_key)
       DO UPDATE SET used = tenant_usage.used + :amount, updated_at = NOW()
       RETURNING used`,
      { replacements: { tenantId, resourceType, periodKey, amount }, transaction }
    );
    return rows[0]?.used || 0;
  }

  async assertCanCreateDocuments(tenant, amount = 1) {
    const plan = this.getPlanName(tenant);
    const limits = await this.getPlanLimits(tenant);

    if (amount <= 0) return this.formatUsage(0, limits.activeDocuments);
    if (isUnlimited(limits.activeDocuments)) return this.formatUsage(0, limits.activeDocuments);

    const used = await this.getActiveDocumentUsage(tenant.id);
    if (used + amount > limits.activeDocuments) {
      throw this.buildQuotaError({
        resource: 'document', plan, limit: limits.activeDocuments, used,
      });
    }
    return this.formatUsage(used, limits.activeDocuments);
  }

  /**
   * Limite de sièges. `options` transporte la transaction des appelants qui en
   * ont une (acceptation d'invitation), pour que le décompte soit cohérent avec
   * le verrou pris sur le tenant.
   */
  async assertCanAddMember(tenant, amount = 1, options = {}) {
    const plan = this.getPlanName(tenant);
    const limits = await this.getPlanLimits(tenant);

    if (amount <= 0 || isUnlimited(limits.maxUsers)) {
      return this.formatUsage(0, limits.maxUsers);
    }

    const used = await this.getMemberUsage(tenant.id, options);
    if (used + amount > limits.maxUsers) {
      throw this.buildQuotaError({
        resource: 'member', plan, limit: limits.maxUsers, used,
      });
    }
    return this.formatUsage(used, limits.maxUsers);
  }
}

module.exports = new QuotaService();
