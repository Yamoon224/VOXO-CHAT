const { AdminUser, AdminRole, User } = require('../models');
const { hasPermission } = require('../config/adminPermissions');
const config = require('../config/config');
const emailService = require('./emailService');
const { logChannelEvent } = require('../utils/channelLogger');

/**
 * Notifications du support, toutes en « meilleur effort » : une panne du
 * fournisseur d'email ne doit jamais empêcher l'enregistrement d'une demande
 * ou d'une réponse.
 */
class SupportNotifier {
  /**
   * Administrateurs habilités à traiter le support.
   *
   * La permission vit dans un JSONB porté par le rôle joint : impossible de
   * filtrer en SQL sans expression brute. On charge donc les comptes actifs
   * avec leur rôle et on filtre en mémoire — acceptable au regard du nombre
   * d'administrateurs, à revoir si la table grossit.
   */
  async findRecipients() {
    const admins = await AdminUser.findAll({
      where: { isActive: true },
      include: [{ model: AdminRole, as: 'role' }],
    });
    return admins.filter(admin => hasPermission(admin, 'support', 'write'));
  }

  /**
   * Journalise l'issue réelle de l'envoi.
   *
   * `failed` est distingué explicitement du cas « aucun destinataire » : le
   * gabarit de la reprise humaine utilisait `every(Boolean)`, qui vaut `true`
   * sur une liste vide et enregistrait donc « envoyé » alors que personne
   * n'avait été prévenu.
   */
  reportOutcome(event, ticketId, recipients, outcomes) {
    if (recipients.length === 0) {
      logChannelEvent('error', `${event}.no_recipient`, { ticketId });
      return 'failed';
    }
    const delivered = outcomes.filter(Boolean).length;
    const status = delivered === outcomes.length ? 'sent' : (delivered === 0 ? 'failed' : 'partial');
    logChannelEvent(status === 'sent' ? 'info' : 'error', `${event}.${status}`, {
      ticketId, delivered, total: outcomes.length,
    });
    return status;
  }

  buildAdminUrl(ticketId) {
    return `${config.app.frontendUrl}/admin/support/${ticketId}`;
  }

  buildTenantUrl(ticketId) {
    return `${config.app.frontendUrl}/dashboard/support?ticket=${ticketId}`;
  }

  async notifyAdminsOfNewTicket({ ticket, tenant, authorName }) {
    try {
      const recipients = await this.findRecipients();
      const outcomes = await Promise.all(recipients.map(admin => emailService.sendBestEffort({
        to: admin.email,
        template: 'supportTicketOpened',
        data: {
          firstName: admin.firstName,
          tenantName: tenant.name,
          authorName,
          subject: ticket.subject,
          priority: ticket.priority,
          ticketUrl: this.buildAdminUrl(ticket.id),
        },
        // Chaque administrateur reçoit l'alerte dans SA langue.
        locale: admin.preferredLocale || 'fr',
      })));
      return this.reportOutcome('support.ticket_opened', ticket.id, recipients, outcomes);
    } catch (error) {
      logChannelEvent('error', 'support.ticket_opened.failed', {
        ticketId: ticket.id, error: error.message,
      });
      return 'failed';
    }
  }

  /** Prévient l'auteur de la demande qu'un administrateur a répondu. */
  async notifyTenantOfReply({ ticket, adminName }) {
    try {
      if (!ticket.openedByUserId) return 'failed';
      const author = await User.findOne({
        where: { id: ticket.openedByUserId, isActive: true },
      });
      if (!author) {
        logChannelEvent('error', 'support.ticket_replied.no_recipient', { ticketId: ticket.id });
        return 'failed';
      }

      const delivered = await emailService.sendBestEffort({
        to: author.email,
        template: 'supportTicketReplied',
        data: {
          firstName: author.firstName,
          adminName,
          subject: ticket.subject,
          ticketUrl: this.buildTenantUrl(ticket.id),
        },
        locale: author.preferredLocale || 'fr',
      });
      return this.reportOutcome('support.ticket_replied', ticket.id, [author], [delivered]);
    } catch (error) {
      logChannelEvent('error', 'support.ticket_replied.failed', {
        ticketId: ticket.id, error: error.message,
      });
      return 'failed';
    }
  }
}

module.exports = new SupportNotifier();
