const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

/**
 * Prévient le nouveau propriétaire qu'il vient d'hériter de l'entreprise :
 * le transfert est décidé unilatéralement par l'owner sortant, le destinataire
 * doit être averti qu'il porte désormais la facturation et les accès.
 * @param {{ firstName: string, tenantName: string, previousOwnerName: string }} data
 */
function ownershipTransferred({ firstName, tenantName, previousOwnerName }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'You are the new owner';
    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p><strong>${escapeHtml(previousOwnerName)}</strong> has deleted their account and `
      + `named you the new owner of <strong>${escapeHtml(tenantName)}</strong>.</p>`
      + `<p>You can now manage the team, the roles, the subscription and the company settings `
      + `from your Voxo Chat settings.</p>`;

    const text = `Hello ${firstName},\n\n`
      + `${previousOwnerName} has deleted their account and named you the new owner `
      + `of ${tenantName}.\n`
      + `You can now manage the team, the roles, the subscription and the company settings `
      + `from your Voxo Chat settings.`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Vous êtes le nouveau propriétaire';
  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p><strong>${escapeHtml(previousOwnerName)}</strong> a supprimé son compte et vous a `
    + `désigné comme nouveau propriétaire de <strong>${escapeHtml(tenantName)}</strong>.</p>`
    + `<p>Vous pouvez désormais gérer l’équipe, les rôles, l’abonnement et les paramètres de `
    + `l’entreprise depuis vos paramètres Voxo Chat.</p>`;

  const text = `Bonjour ${firstName},\n\n`
    + `${previousOwnerName} a supprimé son compte et vous a désigné comme nouveau propriétaire `
    + `de ${tenantName}.\n`
    + `Vous pouvez désormais gérer l'équipe, les rôles, l'abonnement et les paramètres de `
    + `l'entreprise depuis vos paramètres Voxo Chat.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = ownershipTransferred;
