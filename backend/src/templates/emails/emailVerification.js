const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ firstName: string, verifyUrl: string, expiresInHours: number }} data
 */
function emailVerification({ firstName, verifyUrl, expiresInHours }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Confirm your email address';
    const body = `<p>Hello ${escapeHtml(firstName)},</p><p>Welcome to Voxo Chat! Confirm your email to activate your account.</p>`
      + renderButton(verifyUrl, 'Confirm my email')
      + `<p>This single-use link is valid for ${escapeHtml(expiresInHours)} hours.</p>`;
    const text = `Hello ${firstName},\n\nConfirm your email: ${verifyUrl}\n\n`
      + `This link is valid for ${expiresInHours} hours.${renderTextFooter(locale)}`;
    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }
  const title = 'Confirmez votre adresse email';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>Bienvenue sur Voxo Chat ! Confirmez votre adresse email pour activer votre compte.</p>`
    + renderButton(verifyUrl, 'Confirmer mon adresse')
    + `<p>Ce lien est valable ${escapeHtml(expiresInHours)} heures et ne peut être utilisé `
    + `qu’une seule fois.</p>`
    + `<p>Si vous n’avez pas créé de compte Voxo Chat, ignorez cet email.</p>`;

  const text = `Bonjour ${firstName},\n\n`
    + `Bienvenue sur Voxo Chat ! Confirmez votre adresse email pour activer votre compte.\n`
    + `Ouvrez ce lien : ${verifyUrl}\n\n`
    + `Ce lien est valable ${expiresInHours} heures et ne peut être utilisé qu’une seule fois.\n`
    + `Si vous n’avez pas créé de compte Voxo Chat, ignorez cet email.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = emailVerification;
