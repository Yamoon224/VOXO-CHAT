const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');
const config = require('../../config/config');

/**
 * @param {{ firstName: string, tenantName: string }} data
 */
function tenantSuspended({ firstName, tenantName }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Your Voxo workspace has been suspended';
    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>Access to the <strong>${escapeHtml(tenantName)}</strong> workspace has been suspended. `
      + 'Your data is preserved, but dashboard sign-in and the chatbot are interrupted.</p>'
      // Le client doit savoir que la reconnexion des canaux lui incombera : les
      // webhooks ont été retirés chez Telegram et WhatsApp, pas seulement désactivés.
      + '<p>Your Telegram and WhatsApp channels have been disconnected and will need to be '
      + 'reconnected from your settings once access is restored.</p>'
      + renderButton(`mailto:${config.app.supportEmail}`, 'Contact support')
      + '<p>Contact us to learn the reasons and the conditions for restoring access.</p>';

    const text = `Hello ${firstName},\n\n`
      + `Access to the ${tenantName} workspace has been suspended. Your data is preserved, `
      + 'but dashboard sign-in and the chatbot are interrupted.\n'
      + 'Your Telegram and WhatsApp channels have been disconnected and will need to be '
      + 'reconnected from your settings once access is restored.\n'
      + `Contact us: ${config.app.supportEmail}`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre espace Voxo a été suspendu';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>L’accès à l’espace <strong>${escapeHtml(tenantName)}</strong> a été suspendu. `
    + 'Vos données sont conservées, mais la connexion au tableau de bord et le chatbot '
    + 'sont interrompus.</p>'
    // Le client doit savoir que la reconnexion des canaux lui incombera : les
    // webhooks ont été retirés chez Telegram et WhatsApp, pas seulement désactivés.
    + '<p>Vos canaux Telegram et WhatsApp ont été déconnectés et devront être '
    + 'reconnectés depuis vos réglages une fois l’accès rétabli.</p>'
    + renderButton(`mailto:${config.app.supportEmail}`, 'Contacter le support')
    + '<p>Contactez-nous pour connaître les motifs et les conditions de rétablissement.</p>';

  const text = `Bonjour ${firstName},\n\n`
    + `L’accès à l’espace ${tenantName} a été suspendu. Vos données sont conservées, `
    + 'mais la connexion au tableau de bord et le chatbot sont interrompus.\n'
    + 'Vos canaux Telegram et WhatsApp ont été déconnectés et devront être reconnectés '
    + 'depuis vos réglages une fois l’accès rétabli.\n'
    + `Contactez-nous : ${config.app.supportEmail}`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = tenantSuspended;
