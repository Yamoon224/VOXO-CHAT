const { Plan } = require('../models');
const { PLAN_NAMES, DEFAULT_PLAN, getFallbackPlan, getFallbackFeatures } = require('../config/quotaPlans');
const { logChannelEvent } = require('../utils/channelLogger');

/**
 * Accès aux forfaits, avec cache mémoire.
 *
 * Pourquoi un cache : `quotaService.getPlanLimits` est appelé sur le chemin
 * chaud de CHAQUE message entrant (widget, Telegram, WhatsApp). Une requête par
 * message pour quatre lignes qui changent rarement serait du gaspillage pur.
 *
 * Limite assumée : le cache est par processus. Avec plusieurs instances
 * backend, une édition de forfait met jusqu'à `CACHE_TTL_MS` à se propager aux
 * autres instances — l'invalidation explicite ne touche que celle qui écrit.
 */
const CACHE_TTL_MS = 60 * 1000;

class PlanService {
  constructor() {
    this.cache = null;
    this.cachedAt = 0;
  }

  invalidate() {
    this.cache = null;
    this.cachedAt = 0;
  }

  isCacheFresh() {
    return this.cache !== null && Date.now() - this.cachedAt < CACHE_TTL_MS;
  }

  async loadPlans() {
    if (this.isCacheFresh()) return this.cache;

    const rows = await Plan.findAll({ order: [['sortOrder', 'ASC']] });
    this.cache = rows.reduce((byName, plan) => {
      byName[plan.name] = plan.get({ plain: true });
      return byName;
    }, {});
    this.cachedAt = Date.now();
    return this.cache;
  }

  /**
   * Forfait complet. Si la ligne manque en base, on retombe sur les valeurs de
   * repli — mais en le journalisant : un forfait absent dégraderait sinon un
   * client payant en silence.
   */
  async getPlan(planName) {
    const plans = await this.loadPlans();
    const plan = plans[planName];
    if (plan) return plan;

    logChannelEvent('error', 'plan.missing_in_database', { plan: planName });
    return this.buildFallbackPlan(planName);
  }

  buildFallbackPlan(planName) {
    const name = planName || DEFAULT_PLAN;
    return {
      name,
      label: name,
      priceAmount: 0,
      priceCurrency: 'EUR',
      prices: { EUR: 0, USD: null, XOF: null },
      features: getFallbackFeatures(name),
      ...getFallbackPlan(name),
    };
  }

  /** Les seules bornes que `quotaService` applique. */
  async getLimits(planName) {
    const plan = await this.getPlan(planName);
    return {
      messagesPerMonth: plan.messagesPerMonth,
      messagesPerDay: plan.messagesPerDay,
      maxUsers: plan.maxUsers,
      activeDocuments: plan.activeDocuments,
    };
  }

  async getFeatures(planName) {
    const plan = await this.getPlan(planName);
    return { ...plan.features };
  }

  /** Vue publique, triée — alimente l'administration et le tableau des forfaits. */
  async listPlans() {
    const plans = await this.loadPlans();
    const defaults = PLAN_NAMES.map(name => plans[name] || this.buildFallbackPlan(name));
    const extras = Object.values(plans).filter(plan => !PLAN_NAMES.includes(plan.name) && !plan.isArchived);
    return [...defaults, ...extras].filter(plan => !plan.isArchived).map(plan => this.toPublicPlan(plan));
  }

  toPublicPlan(plan) {
    return {
      id: plan.id ?? null,
      name: plan.name,
      label: plan.label,
      priceAmount: plan.priceAmount,
      priceCurrency: plan.priceCurrency,
      prices: { EUR: null, USD: null, XOF: null, ...(plan.prices || {}) },
      messagesPerMonth: plan.messagesPerMonth,
      messagesPerDay: plan.messagesPerDay,
      maxUsers: plan.maxUsers,
      activeDocuments: plan.activeDocuments,
      billingInterval: plan.billingInterval || 'monthly',
      creditsPerCycle: plan.creditsPerCycle || 0,
      allowVisitorAttachments: plan.allowVisitorAttachments !== false,
      allowAgentAttachments: plan.allowAgentAttachments !== false,
      isArchived: Boolean(plan.isArchived),
      features: plan.features || {},
    };
  }
}

module.exports = new PlanService();
module.exports.CACHE_TTL_MS = CACHE_TTL_MS;
