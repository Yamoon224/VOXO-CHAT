const { Plan } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const planService = require('./planService');

const EDITABLE_LIMITS = ['messagesPerMonth', 'messagesPerDay', 'maxUsers', 'activeDocuments'];

/**
 * Édition des forfaits par un administrateur de la plateforme.
 *
 * On ne crée ni ne supprime de forfait : les quatre paliers correspondent aux
 * valeurs de l'ENUM `Tenant.subscription_plan`. Seuls leurs paramètres — prix,
 * limites, caractéristiques — sont modifiables.
 */
class AdminPlanService {
  async listPlans({ includeArchived = false } = {}) {
    const plans = await Plan.findAll({ where: includeArchived ? {} : { isArchived: false }, order: [['sortOrder', 'ASC']] });
    return plans.map(plan => planService.toPublicPlan(plan.get({ plain: true })));
  }

  async findPlanOrFail(planId) {
    const plan = await Plan.findByPk(planId);
    if (!plan) {
      throw new AppError('Forfait introuvable', 404, { code: 'PLAN_NOT_FOUND' });
    }
    return plan;
  }

  /**
   * `null` sur une limite signifie « illimité » et doit rester distinct de
   * « champ non fourni » : seules les clés réellement présentes sont écrites.
   */
  buildChanges(body) {
    const changes = {};
    if (body.label !== undefined) changes.label = body.label.trim();
    if (body.priceAmount !== undefined) changes.priceAmount = body.priceAmount;
    if (body.priceCurrency !== undefined) changes.priceCurrency = body.priceCurrency;
    if (body.prices !== undefined) changes.prices = { ...body.prices };
    if (body.features !== undefined) changes.features = { ...body.features };
    ['billingInterval', 'creditsPerCycle', 'allowVisitorAttachments', 'allowAgentAttachments', 'sortOrder'].forEach((key) => {
      if (body[key] !== undefined) changes[key] = body[key];
    });

    EDITABLE_LIMITS.forEach((limit) => {
      if (body[limit] !== undefined) changes[limit] = body[limit];
    });

    return changes;
  }

  async updatePlan({ planId, ...body }) {
    const plan = await this.findPlanOrFail(planId);
    const changes = this.buildChanges(body);

    if (Object.keys(changes).length === 0) {
      throw new AppError('Aucune modification fournie', 400, { code: 'PLAN_NO_CHANGES' });
    }

    await plan.update(changes);

    // Le cache des forfaits alimente le chemin chaud des quotas : sans cette
    // invalidation, l'édition ne prendrait effet qu'à l'expiration du TTL.
    planService.invalidate();

    return planService.toPublicPlan(plan.get({ plain: true }));
  }

  async createPlan(body) {
    const plan = await Plan.create({ ...this.buildChanges(body), name: body.name.trim().toLowerCase() });
    planService.invalidate();
    return planService.toPublicPlan(plan.get({ plain: true }));
  }

  async archivePlan(planId) {
    const plan = await this.findPlanOrFail(planId);
    const { Tenant } = require('../models');
    const assigned = await Tenant.count({ where: { subscriptionPlan: plan.name } });
    if (assigned) throw new AppError('Ce forfait est encore attribué à des entreprises', 409, { code: 'PLAN_IN_USE' });
    await plan.update({ isArchived: true });
    planService.invalidate();
    return planService.toPublicPlan(plan.get({ plain: true }));
  }
}

module.exports = new AdminPlanService();
