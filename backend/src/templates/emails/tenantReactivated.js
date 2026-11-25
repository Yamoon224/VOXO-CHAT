const { escapeHtml, renderButton, renderLayout, renderTextFooter } = require('./layout');
const config = require('../../config/config');

/**
 * @param {{ firstName: string, tenantName: string }} data
 */
function tenantReactivated({ firstName, tenantName }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Your Voxo workspace is active again';
    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>Access to the <strong>${escapeHtml(tenantName)}</strong> workspace has been restored. `
      + 'Your team can sign in again and the chatbot is answering once more.</p>'
      + '<p>Remember to reconnect your Telegram and WhatsApp channels from your settings: '
      + 'they were disconnected during the suspension.</p>'
      + renderButton(`${config.app.frontendUrl}/dashboard/channels`, 'Reconnect my channels');

    const text = `Hello ${firstName},\n\n`
      + `Access to the ${tenantName} workspace has been restored. Your team can sign in again `
      + 'and the chatbot is answering once more.\n'
      + 'Remember to reconnect your Telegram and WhatsApp channels from your settings: '
      + `${config.app.frontendUrl}/dashboard/channels`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre espace Voxo est de nouveau actif';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>L’accès à l’espace <strong>${escapeHtml(tenantName)}</strong> a été rétabli. `
    + 'Votre équipe peut se reconnecter et le chatbot répond de nouveau.</p>'
    + '<p>Pensez à reconnecter vos canaux Telegram et WhatsApp depuis vos réglages : '
    + 'ils ont été déconnectés pendant la suspension.</p>'
    + renderButton(`${config.app.frontendUrl}/dashboard/channels`, 'Reconnecter mes canaux');

  const text = `Bonjour ${firstName},\n\n`
    + `L’accès à l’espace ${tenantName} a été rétabli. Votre équipe peut se reconnecter `
    + 'et le chatbot répond de nouveau.\n'
    + 'Pensez à reconnecter vos canaux Telegram et WhatsApp depuis vos réglages : '
    + `${config.app.frontendUrl}/dashboard/channels`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = tenantReactivated;
