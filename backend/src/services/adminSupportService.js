const { Op } = require('sequelize');
const {
  SupportTicket, Tenant, User, AdminUser, sequelize,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { STATUSES, PRIORITIES } = require('../models/SupportTicket');
const threadService = require('./supportThreadService');
const notifier = require('./supportNotifier');
const supportEvents = require('./supportEventService');
const notifications = require('./notificationService');

const OPEN_STATUSES = ['open', 'pending'];

const personName = person => (person
  ? [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email
  : null);

/**
 * Boîte de réception du support, côté plateforme.
 *
 * Transverse aux tenants par nature : l'accès est gardé en amont par
 * `authenticateAdmin` + `requireAdminPermission('support', …)`.
 */
class AdminSupportService {
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
      tenantId: ticket.tenantId,
      openedByUserId: ticket.openedByUserId,
      tenantName: ticket.tenant?.name || null,
      openedBy: personName(ticket.openedBy),
      assignedAdminId: ticket.assignedAdminId,
      assignedAdmin: personName(ticket.assignedAdmin),
      lastMessageAt: ticket.lastMessageAt,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
    };
  }

  get includes() {
    return [
      { model: Tenant, as: 'tenant', attributes: ['id', 'name'] },
      { model: User, as: 'openedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: AdminUser, as: 'assignedAdmin', attributes: ['id', 'firstName', 'lastName', 'email'] },
    ];
  }

  async listTickets({ page = 1, limit = 20, status, priority, reason, assignedToMe, actorId }) {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

    const where = {};
    if (status === 'open') where.status = { [Op.in]: OPEN_STATUSES };
    else if (status && STATUSES.includes(status)) where.status = status;
    if (priority && PRIORITIES.includes(priority)) where.priority = priority;
    if (reason) where.reason = reason;
    if (assignedToMe) where.assignedAdminId = actorId;

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: this.includes,
      order: [['lastMessageAt', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
      // `include` avec `hasMany` ailleurs fausserait le compte ; ici toutes les
      // associations sont `belongsTo`, le comptage reste juste.
      distinct: true,
    });

    return {
      tickets: rows.map(ticket => this.toPublicTicket(ticket)),
      pagination: {
        page: safePage, limit: safeLimit, total: count, pages: Math.ceil(count / safeLimit),
      },
    };
  }

  /** Nombre de demandes non traitées : sert le badge, sans dépaginer la liste. */
  async countOpenTickets() {
    return SupportTicket.count({ where: { status: { [Op.in]: OPEN_STATUSES } } });
  }

  async findTicketOrFail(ticketId) {
    const ticket = await SupportTicket.findOne({
      where: { id: ticketId },
      include: this.includes,
    });
    if (!ticket) {
      throw new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' });
    }
    return ticket;
  }

  /** Vue admin : les notes internes sont incluses, contrairement à la vue client. */
  async getTicketDetail(ticketId) {
    const ticket = await this.findTicketOrFail(ticketId);
    return {
      ...this.toPublicTicket(ticket),
      messages: await threadService.listMessages(ticket.id, { includeInternal: true }),
    };
  }

  /**
   * Prise en charge d'une demande.
   *
   * Sous verrou de ligne, contrairement au gabarit de la reprise humaine qui
   * lit puis écrit sans verrou : deux administrateurs cliquant simultanément
   * s'attribueraient sinon le même ticket, et le second écraserait le premier.
   */
  async assignTicket({ ticketId, actor, adminId = null }) {
    const assignee = adminId === null ? actor.id : adminId;
    const recipients = await notifier.findRecipients();
    if (!recipients.some(admin => admin.id === assignee)) {
      throw new AppError('Administrateur de support introuvable', 404, { code: 'SUPPORT_ASSIGNEE_NOT_FOUND' });
    }

    await sequelize.transaction(async (transaction) => {
      const ticket = await SupportTicket.findByPk(ticketId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!ticket) {
        throw new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' });
      }
      // Le verrou de ligne sérialise les réattributions.
      if (ticket.assignedAdminId && ticket.assignedAdminId !== assignee) ticket.assignedAdminId = null;
      if (ticket.assignedAdminId && ticket.assignedAdminId !== assignee) {
        throw new AppError('Cette demande est déjà prise en charge par un autre administrateur', 409, {
          code: 'SUPPORT_TICKET_ALREADY_ASSIGNED',
        });
      }
      if (ticket.assignedAdminId === assignee) return;

      await ticket.update({ assignedAdminId: assignee }, { transaction });
    });

    const detail = await this.getTicketDetail(ticketId);
    await notifications.markTicketReadForOtherAdmins(ticketId, assignee);
    await notifications.notify({
      recipientType: 'admin', recipientId: assignee, type: 'support.assigned',
      title: 'Demande de support attribu\u00e9e', body: `${detail.openedBy || detail.tenantName} : ${detail.subject}`,
      url: `/admin/support/${ticketId}`,
    });
    supportEvents.publish({ ticketId, tenantId: detail.tenantId, type: 'support.assigned' });
    return detail;
  }

  async releaseTicket({ ticketId, actor }) {
    const ticket = await this.findTicketOrFail(ticketId);
    if (ticket.assignedAdminId && ticket.assignedAdminId !== actor.id) {
      throw new AppError('Seul l’administrateur assigné peut se retirer de cette demande', 403, {
        code: 'SUPPORT_TICKET_NOT_ASSIGNED',
      });
    }
    await ticket.update({ assignedAdminId: null });
    const detail = await this.getTicketDetail(ticketId);
    supportEvents.publish({ ticketId, tenantId: detail.tenantId, type: 'support.released' });
    return detail;
  }

  async updateStatus({ ticketId, status }) {
    const ticket = await this.findTicketOrFail(ticketId);
    if (ticket.status === status) {
      throw new AppError('Cette demande a déjà ce statut', 409, {
        code: 'SUPPORT_STATUS_UNCHANGED',
      });
    }

    await ticket.update({
      status,
      resolvedAt: ['resolved', 'closed'].includes(status) ? new Date() : null,
    });
    const detail = await this.getTicketDetail(ticketId);
    supportEvents.publish({ ticketId, tenantId: detail.tenantId, type: 'support.status_changed' });
    if (detail.openedByUserId) await notifications.notify({
      recipientType: 'user', recipientId: detail.openedByUserId, tenantId: detail.tenantId,
      type: 'support.status_changed', title: 'Statut de votre demande mis \u00e0 jour', body: detail.subject,
      url: `/dashboard/support?ticket=${ticketId}`,
    });
    return detail;
  }

  async reply({ ticketId, actor, content, internal = false, clientMessageId }) {
    const ticket = await this.findTicketOrFail(ticketId);

    const result = await threadService.addMessage({
      ticketId: ticket.id,
      authorType: 'admin',
      authorId: actor.id,
      authorName: personName(actor),
      content,
      internal,
      clientMessageId,
    });

    // Une note interne ne concerne pas le client : aucune notification.
    if (!internal && !result.duplicate) {
      await notifier.notifyTenantOfReply({ ticket, adminName: personName(actor) });
      supportEvents.publish({ ticketId: ticket.id, tenantId: ticket.tenantId });
      if (ticket.openedByUserId) await notifications.notify({
        recipientType: 'user', recipientId: ticket.openedByUserId, tenantId: ticket.tenantId,
        type: 'support.replied', title: 'Nouvelle r\u00e9ponse du support', body: `${personName(actor)} : ${ticket.subject}`,
        url: `/dashboard/support?ticket=${ticket.id}`,
      });
    } else if (!result.duplicate) {
      supportEvents.publish({ ticketId: ticket.id, tenantId: ticket.tenantId, internal: true });
    }

    return this.getTicketDetail(ticketId);
  }
}

module.exports = new AdminSupportService();
module.exports.OPEN_STATUSES = OPEN_STATUSES;
