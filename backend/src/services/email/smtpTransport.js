const config = require('../../config/config');
const { AppError } = require('../../middleware/errorMiddleware');

/**
 * Transport SMTP historique (Nodemailer). Conservé comme repli, activable via
 * EMAIL_PROVIDER=smtp. Le transport actif par défaut est brevoTransport.
 * `nodemailer` est chargé à la demande : le chemin Brevo n'en dépend pas.
 */
class SmtpTransport {
  constructor() {
    this.transporter = null;
  }

  isConfigured() {
    const { host, user, password } = config.smtp;
    return Boolean(host && user && password);
  }

  loadNodemailer() {
    try {
      return require('nodemailer');
    } catch (error) {
      throw new AppError('Le service d’envoi d’email n’est pas configuré', 503, {
        code: 'EMAIL_SERVICE_UNAVAILABLE',
        details: { reason: 'nodemailer non installé' },
      });
    }
  }

  getTransporter() {
    if (!this.isConfigured()) {
      throw new AppError('Le service d’envoi d’email n’est pas configuré', 503, {
        code: 'EMAIL_SERVICE_UNAVAILABLE',
      });
    }
    if (!this.transporter) {
      this.transporter = this.loadNodemailer().createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.password },
      });
    }
    return this.transporter;
  }

  async send({ to, subject, html, text, attachments }) {
    try {
      const info = await this.getTransporter().sendMail({
        from: config.smtp.from,
        to,
        subject,
        text,
        html,
        attachments,
      });
      return { messageId: info.messageId || null };
    } catch (error) {
      if (error.isOperational) throw error;
      throw new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { reason: error.message },
      });
    }
  }
}

module.exports = new SmtpTransport();
