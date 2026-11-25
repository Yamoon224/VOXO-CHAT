const config = require('../../config/config');
const { AppError } = require('../../middleware/errorMiddleware');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

class BrevoTransport {
  isConfigured() {
    const { apiKey, senderEmail } = config.email.brevo;
    return Boolean(apiKey && senderEmail);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new AppError('Le service d’envoi d’email n’est pas configuré', 503, {
        code: 'EMAIL_SERVICE_UNAVAILABLE',
      });
    }
  }

  buildPayload({ to, subject, html, text, attachments = [] }) {
    const { senderEmail, senderName } = config.email.brevo;
    return {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
      ...(attachments.length > 0 && {
        attachment: attachments.map(item => ({
          name: item.filename,
          content: item.content.toString('base64'),
        })),
      }),
    };
  }

  async send({ to, subject, html, text, attachments }) {
    this.assertConfigured();

    let response;
    try {
      response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': config.email.brevo.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(this.buildPayload({ to, subject, html, text, attachments })),
      });
    } catch (error) {
      throw new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { reason: error.message },
      });
    }

    if (!response.ok) {
      // On ne journalise que la réponse Brevo : le body de la requête contient
      // les liens porteurs de jetons et ne doit jamais atterrir dans les logs.
      const reason = await response.text().catch(() => '');
      throw new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { status: response.status, reason },
      });
    }

    const body = await response.json().catch(() => ({}));
    return { messageId: body.messageId || null };
  }
}

module.exports = new BrevoTransport();
