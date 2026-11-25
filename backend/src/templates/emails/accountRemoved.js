const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

/**
 * Informe un membre que le propriétaire de l'entreprise a supprimé son compte.
 * Distinct de `accountDeleted` : ici l'utilisateur subit l'action, il doit
 * savoir vers qui se tourner.
 * @param {{ firstName: string, tenantName: string, purgeDate: string }} data
 */
function accountRemoved({ firstName, tenantName, purgeDate }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Your access has been removed';
    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>The owner of <strong>${escapeHtml(tenantName)}</strong> has deleted your Voxo Chat `
      + `account. You can no longer sign in to this workspace.</p>`
      + `<p>Your data will be permanently erased from our servers on `
      + `<strong>${escapeHtml(purgeDate)}</strong>.</p>`
      + `<p>If you believe this is a mistake, get in touch with the company owner: `
      + `only they can invite you again.</p>`;

    const text = `Hello ${firstName},\n\n`
      + `The owner of ${tenantName} has deleted your Voxo Chat account. `
      + `You can no longer sign in to this workspace.\n`
      + `Your data will be permanently erased on ${purgeDate}.\n`
      + `If you believe this is a mistake, get in touch with the company owner.`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre accès a été supprimé';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>Le propriétaire de <strong>${escapeHtml(tenantName)}</strong> a supprimé votre compte `
    + `Voxo Chat. Vous ne pouvez plus vous connecter à cet espace.</p>`
    + `<p>Vos données seront effacées définitivement de nos serveurs le `
    + `<strong>${escapeHtml(purgeDate)}</strong>.</p>`
    + `<p>Si vous pensez qu’il s’agit d’une erreur, rapprochez-vous du propriétaire de `
    + `l’entreprise : lui seul peut vous inviter à nouveau.</p>`;

  const text = `Bonjour ${firstName},\n\n`
    + `Le propriétaire de ${tenantName} a supprimé votre compte Voxo Chat. `
    + `Vous ne pouvez plus vous connecter à cet espace.\n`
    + `Vos données seront effacées définitivement le ${purgeDate}.\n`
    + `Si vous pensez qu'il s'agit d'une erreur, rapprochez-vous du propriétaire de l'entreprise.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = accountRemoved;
