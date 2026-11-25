const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ inviterName: string, invitationUrl: string, expiresInHours: number }} data
 */
function adminInvitation({ inviterName, invitationUrl, expiresInHours }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Invitation to the Voxo administration platform';
    const body = `<p>${escapeHtml(inviterName)} is inviting you to join the `
      + '<strong>Voxo administration platform</strong>.</p>'
      + renderButton(invitationUrl, 'Create my administrator account')
      + `<p>This link expires in ${escapeHtml(expiresInHours)} hours.</p>`;

    const text = `${inviterName} is inviting you to join the Voxo administration platform.\n`
      + `Create your account within ${expiresInHours} hours: ${invitationUrl}`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Invitation à la plateforme d’administration Voxo';
  const body = `<p>${escapeHtml(inviterName)} vous invite à rejoindre la `
    + '<strong>plateforme d’administration Voxo</strong>.</p>'
    + renderButton(invitationUrl, 'Créer mon compte administrateur')
    + `<p>Ce lien expire dans ${escapeHtml(expiresInHours)} heures.</p>`;

  const text = `${inviterName} vous invite à rejoindre la plateforme d’administration Voxo.\n`
    + `Créez votre compte sous ${expiresInHours} heures : ${invitationUrl}`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = adminInvitation;
