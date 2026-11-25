const { SupportTicket, SupportMessage, User, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const threadService = require('./supportThreadService');
const notifier = require('./supportNotifier');
const supportEvents = require('./supportEventService');
const notifications = require('./notificationService');

const authorName = user => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
const SUBJECTS = {
  billing: 'Facturation / forfait', account_access: 'Compte et accès',
  chatbot_setup: 'Configuration du chatbot', integrations: 'Intégrations et canaux',
  documents: 'Documents', technical_issue: 'Problème technique',
};
const PRIORITIES_BY_REASON = {
  billing: 'normal', account_access: 'high', chatbot_setup: 'normal',
  integrations: 'normal', documents: 'low', technical_issue: 'high', other: 'normal',
};

function subjectForReason(reason, otherReason) {
  if (reason !== 'other') return SUBJECTS[reason];
  return `Autre : ${otherReason.trim().slice(0, 111)}`;
}

function priorityForReason(reason) {
  return PRIORITIES_BY_REASON[reason] || 'normal';
}

/**
 * Demandes de support, côté entreprise cliente.
 *
 * Toute requête est filtrée par `tenantId` : une entreprise ne voit jamais les
 * demandes d'une autre. La règle plus fine — qui, dans l'entreprise, peut lire
 * une demande donnée — vit ici et non dans un `requirePermission`, car elle
 * dépend de l'auteur du ticket, pas d'une ressource.
 */
class SupportTicketService {
  toPublicTicket(ticket) {
    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      requestedPlan: ticket.type === 'plan_change' ? ticket.requestedPlan : null,
      requestNote: ticket.type === 'plan_change' ? ticket.requestNote : null,
      reason: ticket.reason,
      otherReason: ticket.otherReason,
      openedBy: ticket.openedBy ? authorName(ticket.openedBy) : null,
      lastMessageAt: ticket.lastMessageAt,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
    };
  }

  async listTickets(tenantId) {
    const tickets = await SupportTicket.findAll({
      where: { tenantId },
      include: [{ model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['lastMessageAt', 'DESC']],
      limit: 100,
    });
    return tickets.map(ticket => this.toPublicTicket(ticket));
  }

  /**
   * Un propriétaire ou un administrateur voit toutes les demandes de son
   * entreprise ; un membre simple ne voit que les siennes.
   */
  canRead(ticket, actor) {
    if (['owner', 'admin'].includes(actor.role)) return true;
    return ticket.openedByUserId === actor.id;
  }

  async findTicketOrFail(tenantId, ticketId, actor) {
    const ticket = await SupportTicket.findOne({
      where: { id: ticketId, tenantId },
      include: [{ model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    if (!ticket) {
      throw new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' });
    }
    if (!this.canRead(ticket, actor)) {
      throw new AppError('Vous n’avez pas accès à cette demande', 403, {
        code: 'SUPPORT_TICKET_FORBIDDEN',
      });
    }
    return ticket;
  }

  /** Fil vu par le client : les notes internes en sont exclues, à la requête. */
  async getTicketDetail(tenantId, ticketId, actor) {
    const ticket = await this.findTicketOrFail(tenantId, ticketId, actor);
    return {
      ...this.toPublicTicket(ticket),
      messages: await threadService.listMessages(ticket.id, { includeInternal: false }),
    };
  }

  async createTicket({ tenant, actor, message, reason, otherReason }) {
    const ticket = await sequelize.transaction(async (transaction) => {
      const created = await SupportTicket.create({
        tenantId: tenant.id,
        openedByUserId: actor.id,
        subject: subjectForReason(reason, otherReason),
        priority: priorityForReason(reason),
        reason,
        otherReason: reason === 'other' ? otherReason.trim() : null,
        status: 'open',
        lastMessageAt: new Date(),
      }, { transaction });

      // Le premier message reprend l'identifiant du ticket comme clé
      // d'idempotence : une double soumission du formulaire ne crée qu'un fil.
      await SupportMessage.create({
        ticketId: created.id,
        authorType: 'tenant',
        authorId: actor.id,
        authorName: authorName(actor),
        role: 'message',
        content: message.trim(),
        clientMessageId: created.id,
      }, { transaction });

      return created;
    });

    // Meilleur effort, hors transaction : une panne d'email ne doit jamais
    // empêcher l'enregistrement de la demande.
    await notifier.notifyAdminsOfNewTicket({ ticket, tenant, authorName: authorName(actor) });
    supportEvents.publish({ ticketId: ticket.id, tenantId: tenant.id, type: 'support.created' });
    const admins = await notifier.findRecipients();
    await Promise.all(admins.map(admin => notifications.notify({
      recipientType: 'admin', recipientId: admin.id, type: 'support.created',
      title: 'Nouvelle demande de support', body: `${authorName(actor)} a ouvert : ${ticket.subject}`, url: `/admin/support/${ticket.id}`,
    })));

    return this.getTicketDetail(tenant.id, ticket.id, actor);
  }

  async replyToTicket({ tenant, actor, ticketId, content, clientMessageId }) {
    const ticket = await this.findTicketOrFail(tenant.id, ticketId, actor);

    const result = await threadService.addMessage({
      ticketId: ticket.id,
      authorType: 'tenant',
      authorId: actor.id,
      authorName: authorName(actor),
      content,
      clientMessageId,
    });
    if (!result.duplicate) {
      supportEvents.publish({ ticketId: ticket.id, tenantId: tenant.id });
      const admins = ticket.assignedAdminId
        ? [{ id: ticket.assignedAdminId }]
        : await notifier.findRecipients();
      await Promise.all(admins.map(admin => notifications.notify({
        recipientType: 'admin', recipientId: admin.id, type: 'support.replied',
        title: 'Nouvelle r\u00e9ponse support', body: `${authorName(actor)} vous a r\u00e9pondu : ${ticket.subject}`, url: `/admin/support/${ticket.id}`,
      })));
    }

    return this.getTicketDetail(tenant.id, ticket.id, actor);
  }
}

module.exports = new SupportTicketService();
module.exports.priorityForReason = priorityForReason;
