const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

/**
 * Notifie l'invitant qu'un membre a rejoint l'équipe.
 * @param {{ inviterName: string, memberName: string,
 *           memberEmail: string, tenantName: string }} data
 */
function invitationAccepted({ inviterName, memberName, memberEmail, tenantName }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Your invitation was accepted';
    const body = `<p>Hello ${escapeHtml(inviterName)},</p>`
      + `<p><strong>${escapeHtml(memberName)}</strong> (${escapeHtml(memberEmail)}) has joined `
      + `<strong>${escapeHtml(tenantName)}</strong> on Voxo Chat.</p>`
      + `<p>You can manage your team's access from your workspace settings.</p>`;

    const text = `Hello ${inviterName},\n\n`
      + `${memberName} (${memberEmail}) has joined ${tenantName} on Voxo Chat.\n`
      + `You can manage your team's access from your workspace settings.`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre invitation a été acceptée';
  const body = `<p>Bonjour ${escapeHtml(inviterName)},</p>`
    + `<p><strong>${escapeHtml(memberName)}</strong> (${escapeHtml(memberEmail)}) a rejoint `
    + `<strong>${escapeHtml(tenantName)}</strong> sur Voxo Chat.</p>`
    + `<p>Vous pouvez gérer les accès de votre équipe depuis les paramètres de votre espace.</p>`;

  const text = `Bonjour ${inviterName},\n\n`
    + `${memberName} (${memberEmail}) a rejoint ${tenantName} sur Voxo Chat.\n`
    + `Vous pouvez gérer les accès de votre équipe depuis les paramètres de votre espace.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = invitationAccepted;
