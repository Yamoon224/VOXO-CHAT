const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ firstName: string, resetUrl: string, expiresInHours: number }} data
 */
function passwordReset({ firstName, resetUrl, expiresInHours }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Reset your password';
    const body = `<p>Hello ${escapeHtml(firstName)},</p><p>You requested a password reset for Voxo Chat.</p>`
      + renderButton(resetUrl, 'Reset my password')
      + `<p>This single-use link is valid for ${escapeHtml(expiresInHours)} hour(s).</p>`
      + `<p>If you did not request this, ignore this email. Your password remains unchanged.</p>`;
    const text = `Hello ${firstName},\n\nReset your password: ${resetUrl}\n\n`
      + `This single-use link is valid for ${expiresInHours} hour(s).${renderTextFooter(locale)}`;
    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }
  const title = 'Réinitialisation de votre mot de passe';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>Vous avez demandé la réinitialisation de votre mot de passe Voxo Chat. `
    + `Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>`
    + renderButton(resetUrl, 'Réinitialiser mon mot de passe')
    + `<p>Ce lien est valable ${escapeHtml(expiresInHours)} heure(s) et ne peut être utilisé qu’une seule fois.</p>`
    + `<p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : `
    + `votre mot de passe reste inchangé.</p>`;

  const text = `Bonjour ${firstName},\n\n`
    + `Vous avez demandé la réinitialisation de votre mot de passe Voxo Chat.\n`
    + `Ouvrez ce lien pour en choisir un nouveau : ${resetUrl}\n\n`
    + `Ce lien est valable ${expiresInHours} heure(s) et ne peut être utilisé qu’une seule fois.\n`
    + `Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = passwordReset;
