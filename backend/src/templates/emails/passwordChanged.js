const config = require('../../config/config');
const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

/**
 * @param {{ firstName: string }} data
 */
function passwordChanged({ firstName }, locale = 'fr') {
  const supportEmail = config.app.supportEmail;

  if (locale === 'en') {
    const title = 'Your password has been changed';
    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>The password for your Voxo Chat account has just been changed.</p>`
      + `<p>If you made this change, no action is needed. Otherwise, contact us immediately at `
      + `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#3b82f6;">`
      + `${escapeHtml(supportEmail)}</a>.</p>`;

    const text = `Hello ${firstName},\n\n`
      + `The password for your Voxo Chat account has just been changed.\n`
      + `If you did not make this change, contact us immediately at ${supportEmail}.`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre mot de passe a été modifié';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>Le mot de passe de votre compte Voxo Chat vient d’être modifié.</p>`
    + `<p>Si vous êtes à l’origine de ce changement, aucune action n’est nécessaire. `
    + `Dans le cas contraire, contactez-nous immédiatement à `
    + `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#3b82f6;">`
    + `${escapeHtml(supportEmail)}</a>.</p>`;

  const text = `Bonjour ${firstName},\n\n`
    + `Le mot de passe de votre compte Voxo Chat vient d’être modifié.\n`
    + `Si vous n’êtes pas à l’origine de ce changement, contactez-nous immédiatement `
    + `à ${supportEmail}.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = passwordChanged;
