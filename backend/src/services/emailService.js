const { getTransport } = require('./email');
const templates = require('../templates/emails');
const { AppError } = require('../middleware/errorMiddleware');
const { logChannelEvent } = require('../utils/channelLogger');

const MAX_REASON_LENGTH = 500;

/** Une réponse d'erreur du fournisseur (ou d'un WAF) peut être volumineuse. */
function truncate(value) {
  if (typeof value !== 'string') return value;
  return value.length > MAX_REASON_LENGTH ? `${value.slice(0, MAX_REASON_LENGTH)}…` : value;
}

class EmailService {
  /**
   * Rend un template et l'envoie via le transport actif.
   * Journalise uniquement des métadonnées : jamais le contenu ni les jetons.
   */
  async sendEmail({ to, template, data = {}, attachments = [], locale = 'fr' }) {
    const render = templates[template];
    if (!render) {
      throw new AppError('Template d’email inconnu', 500, { code: 'EMAIL_TEMPLATE_UNKNOWN' });
    }

    const { subject, html, text } = render(data, locale);
    try {
      const { messageId } = await getTransport().send({ to, subject, html, text, attachments });
      logChannelEvent('info', 'email.sent', { to, template, messageId });
      return { messageId };
    } catch (error) {
      // `details` ne porte que la RÉPONSE du fournisseur, jamais le corps de la
      // requête : le journaliser ne peut pas fuiter les liens à jeton.
      logChannelEvent('error', 'email.failed', {
        to,
        template,
        code: error.code || 'EMAIL_SEND_FAILED',
        status: error.details?.status,
        reason: truncate(error.details?.reason ?? error.message),
      });
      throw error;
    }
  }

  /**
   * Envoi « meilleur effort » pour les notifications secondaires : une panne
   * du fournisseur ne doit jamais faire échouer l'action métier.
   */
  async sendBestEffort(params) {
    try {
      await this.sendEmail(params);
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendTeamInvitation({ email, tenantName, inviterName, invitationUrl, expiresInHours, locale }) {
    try {
      await this.sendEmail({
        to: email,
        template: 'teamInvitation',
        data: { tenantName, inviterName, invitationUrl, expiresInHours }, locale,
      });
    } catch (error) {
      if (error.isOperational) throw error;
      throw new AppError('Impossible d’envoyer l’email d’invitation', 502, {
        code: 'INVITATION_EMAIL_FAILED',
      });
    }
  }

  async sendAdminInvitation({ email, inviterName, invitationUrl, expiresInHours, locale }) {
    try {
      await this.sendEmail({
        to: email,
        template: 'adminInvitation',
        data: { inviterName, invitationUrl, expiresInHours }, locale,
      });
    } catch (error) {
      if (error.isOperational) throw error;
      throw new AppError('Impossible d’envoyer l’email d’invitation', 502, {
        code: 'INVITATION_EMAIL_FAILED',
      });
    }
  }

  async sendPasswordReset({ email, firstName, resetUrl, expiresInHours, locale }) {
    return this.sendEmail({
      to: email,
      template: 'passwordReset',
      data: { firstName, resetUrl, expiresInHours }, locale,
    });
  }

  async sendPasswordChanged({ email, firstName, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'passwordChanged',
      data: { firstName }, locale,
    });
  }

  async sendEmailVerification({ email, firstName, verifyUrl, expiresInHours, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'emailVerification',
      data: { firstName, verifyUrl, expiresInHours }, locale,
    });
  }

  async sendInvitationAccepted({ email, inviterName, memberName, memberEmail, tenantName, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'invitationAccepted',
      data: { inviterName, memberName, memberEmail, tenantName }, locale,
    });
  }

  async sendAccountDeleted({ email, firstName, tenantName, purgeDate, companyDeleted, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'accountDeleted',
      data: { firstName, tenantName, purgeDate, companyDeleted }, locale,
    });
  }

  async sendAccountRemoved({ email, firstName, tenantName, purgeDate, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'accountRemoved',
      data: { firstName, tenantName, purgeDate }, locale,
    });
  }

  async sendOwnershipTransferred({ email, firstName, tenantName, previousOwnerName, locale }) {
    return this.sendBestEffort({
      to: email,
      template: 'ownershipTransferred',
      data: { firstName, tenantName, previousOwnerName }, locale,
    });
  }

  async sendConversationExport({ email, tenantName, conversationTitle, filename, content, locale }) {
    return this.sendEmail({
      to: email,
      template: 'conversationExport',
      data: { tenantName, conversationTitle },
      attachments: [{ filename, content, contentType: 'application/pdf' }],
      locale,
    });
  }
}

module.exports = new EmailService();
