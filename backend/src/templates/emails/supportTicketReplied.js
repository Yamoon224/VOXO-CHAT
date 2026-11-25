const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ firstName: string, adminName: string, subject: string, ticketUrl: string }} data
 */
function supportTicketReplied({ firstName, adminName, subject, ticketUrl }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Reply to your support request';

    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>${escapeHtml(adminName)} has replied to your request `
      + `<strong>${escapeHtml(subject)}</strong>.</p>`
      + renderButton(ticketUrl, 'View the reply');

    const text = `Hello ${firstName},\n\n`
      + `${adminName} has replied to your request "${subject}".\n`
      + `View the reply: ${ticketUrl}`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Réponse à votre demande de support';

  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>${escapeHtml(adminName)} a répondu à votre demande `
    + `<strong>${escapeHtml(subject)}</strong>.</p>`
    + renderButton(ticketUrl, 'Voir la réponse');

  const text = `Bonjour ${firstName},\n\n`
    + `${adminName} a répondu à votre demande « ${subject} ».\n`
    + `Voir la réponse : ${ticketUrl}`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = supportTicketReplied;
