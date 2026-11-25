const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

const PRIORITY_LABELS_FR = { low: 'basse', normal: 'normale', high: 'haute' };
const PRIORITY_LABELS_EN = { low: 'low', normal: 'normal', high: 'high' };

/**
 * @param {{ firstName: string, tenantName: string, authorName: string,
 *           subject: string, priority: string, ticketUrl: string }} data
 */
function supportTicketOpened(
  { firstName, tenantName, authorName, subject, priority, ticketUrl },
  locale = 'fr'
) {
  if (locale === 'en') {
    const title = `New support request — ${tenantName}`;
    const priorityLabel = PRIORITY_LABELS_EN[priority] || priority;

    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p><strong>${escapeHtml(authorName)}</strong> (${escapeHtml(tenantName)}) has opened `
      + 'a support request.</p>'
      + `<p>Subject: <strong>${escapeHtml(subject)}</strong><br>`
      + `Priority: ${escapeHtml(priorityLabel)}</p>`
      + renderButton(ticketUrl, 'Open the request');

    const text = `Hello ${firstName},\n\n`
      + `${authorName} (${tenantName}) has opened a support request.\n`
      + `Subject: ${subject}\nPriority: ${priorityLabel}\n`
      + `Open: ${ticketUrl}`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = `Nouvelle demande de support — ${tenantName}`;
  const priorityLabel = PRIORITY_LABELS_FR[priority] || priority;

  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p><strong>${escapeHtml(authorName)}</strong> (${escapeHtml(tenantName)}) a ouvert `
    + 'une demande d’assistance.</p>'
    + `<p>Objet : <strong>${escapeHtml(subject)}</strong><br>`
    + `Priorité : ${escapeHtml(priorityLabel)}</p>`
    + renderButton(ticketUrl, 'Ouvrir la demande');

  const text = `Bonjour ${firstName},\n\n`
    + `${authorName} (${tenantName}) a ouvert une demande d’assistance.\n`
    + `Objet : ${subject}\nPriorité : ${priorityLabel}\n`
    + `Ouvrir : ${ticketUrl}`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = supportTicketOpened;
