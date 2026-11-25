const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { SupportTicket, SupportMessage, Tenant, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const planService = require('./planService');
const quotaService = require('./quotaService');
const notifier = require('./supportNotifier');

const ACTIVE_STATUSES = ['open', 'pending'];
const actorName = actor => [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email;

class PlanChangeRequestService {
  async create({ tenant, actor, requestedPlan, note }) {
    const plans = await planService.listPlans();
    const plan = plans.find(item => item.name === requestedPlan);
    const effectivePlan = quotaService.getPlanName(tenant);
    if (!plan) throw new AppError('Le forfait demandé est introuvable', 400, { code: 'PLAN_NOT_FOUND' });
    if (requestedPlan === effectivePlan) {
      throw new AppError('Votre entreprise utilise déjà ce forfait', 409, { code: 'PLAN_ALREADY_ACTIVE' });
    }

    const ticket = await sequelize.transaction(async (transaction) => {
      const active = await SupportTicket.findOne({
        where: { tenantId: tenant.id, type: 'plan_change', status: { [Op.in]: ACTIVE_STATUSES } },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (active) throw new AppError('Une demande de changement de forfait est déjà en cours', 409, {
        code: 'PLAN_CHANGE_ALREADY_PENDING',
      });
      const created = await SupportTicket.create({
        tenantId: tenant.id, openedByUserId: actor.id, type: 'plan_change', requestedPlan,
        requestNote: note || null, subject: `Demande de forfait : ${plan.label}`,
        priority: 'normal', reason: 'billing', status: 'open', lastMessageAt: new Date(),
      }, { transaction });
      await SupportMessage.create({
        ticketId: created.id, authorType: 'tenant', authorId: actor.id, authorName: actorName(actor),
        role: 'message', content: note || `Demande de passage au forfait ${plan.label}.`,
        clientMessageId: created.id,
      }, { transaction });
      return created;
    });
    await notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: actorName(actor) });
    return ticket;
  }

  async approve({ ticketId, admin, subscriptionExpiresAt }) {
    const expiresAt = new Date(subscriptionExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new AppError('La date d’échéance doit être dans le futur', 400, {
        code: 'PLAN_CHANGE_EXPIRY_INVALID',
      });
    }
    const result = await sequelize.transaction(async (transaction) => {
      const ticket = await SupportTicket.findByPk(ticketId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!ticket) throw new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' });
      if (ticket.type !== 'plan_change' || !ticket.requestedPlan) {
        throw new AppError('Cette demande ne concerne pas un changement de forfait', 409, { code: 'PLAN_CHANGE_TICKET_REQUIRED' });
      }
      if (!ACTIVE_STATUSES.includes(ticket.status)) {
        throw new AppError('Cette demande n’est plus active', 409, { code: 'PLAN_CHANGE_NOT_ACTIVE' });
      }
      const tenant = await Tenant.findByPk(ticket.tenantId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!tenant) throw new AppError('Entreprise introuvable', 404, { code: 'TENANT_NOT_FOUND' });
      await tenant.update({ subscriptionPlan: ticket.requestedPlan, subscriptionExpiresAt }, { transaction });
      const content = `Votre forfait ${ticket.requestedPlan} est activé jusqu’au ${new Date(subscriptionExpiresAt).toLocaleDateString('fr-FR')}.`;
      await SupportMessage.create({
        ticketId: ticket.id, authorType: 'admin', authorId: admin.id, authorName: actorName(admin),
        role: 'message', content, clientMessageId: uuidv4(),
      }, { transaction });
      await ticket.update({ status: 'resolved', resolvedAt: new Date(), lastMessageAt: new Date() }, { transaction });
      return ticket;
    });
    await notifier.notifyTenantOfReply({ ticket: result, adminName: actorName(admin) });
    return result.id;
  }
}

module.exports = new PlanChangeRequestService();
