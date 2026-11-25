const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ tenantName: string, inviterName: string,
 *           invitationUrl: string, expiresInHours: number }} data
 */
function teamInvitation({ tenantName, inviterName, invitationUrl, expiresInHours }, locale = 'fr') {
  if (locale === 'en') {
    const title = `Invitation to join ${tenantName}`;
    const body = `<p>${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(tenantName)}</strong> on Voxo Chat.</p>`
      + renderButton(invitationUrl, 'Accept invitation')
      + `<p>This link expires in ${escapeHtml(expiresInHours)} hours.</p>`;
    const text = `${inviterName} invited you to join ${tenantName} on Voxo Chat.\n`
      + `Create your account within ${expiresInHours} hours: ${invitationUrl}${renderTextFooter(locale)}`;
    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }
  const title = `Invitation à rejoindre ${tenantName}`;
  const body = `<p>${escapeHtml(inviterName)} vous invite à rejoindre `
    + `<strong>${escapeHtml(tenantName)}</strong> sur Voxo Chat.</p>`
    + renderButton(invitationUrl, 'Accepter l’invitation')
    + `<p>Ce lien expire dans ${escapeHtml(expiresInHours)} heures.</p>`;

  const text = `${inviterName} vous invite à rejoindre ${tenantName} sur Voxo Chat.\n`
    + `Créez votre compte sous ${expiresInHours} heures : ${invitationUrl}`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = teamInvitation;
