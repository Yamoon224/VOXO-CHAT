const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

/**
 * Confirme à l'utilisateur la suppression de son propre compte et annonce la
 * date de purge définitive : c'est la seule trace qu'il conservera, puisqu'il
 * n'a plus accès au tableau de bord.
 * @param {{ firstName: string, tenantName: string,
 *           purgeDate: string, companyDeleted: boolean }} data
 */
function accountDeleted({ firstName, tenantName, purgeDate, companyDeleted }, locale = 'fr') {
  if (locale === 'en') {
    const title = 'Your account has been deleted';
    const scopeHtml = companyDeleted
      ? `<p>The company <strong>${escapeHtml(tenantName)}</strong>, its subscription and all `
        + `of its data have also been deleted: no member could take over the account.</p>`
      : `<p>You no longer have access to the <strong>${escapeHtml(tenantName)}</strong> workspace.</p>`;

    const body = `<p>Hello ${escapeHtml(firstName)},</p>`
      + `<p>Your Voxo Chat account has been deleted. You can no longer sign in.</p>`
      + scopeHtml
      + `<p>Your data will be permanently erased from our servers on `
      + `<strong>${escapeHtml(purgeDate)}</strong>. This deletion is irreversible.</p>`
      + `<p>If you did not request this, contact us immediately.</p>`;

    const scopeText = companyDeleted
      ? `The company ${tenantName}, its subscription and all of its data have also been deleted.`
      : `You no longer have access to the ${tenantName} workspace.`;

    const text = `Hello ${firstName},\n\n`
      + `Your Voxo Chat account has been deleted. You can no longer sign in.\n`
      + `${scopeText}\n`
      + `Your data will be permanently erased on ${purgeDate}. This deletion is irreversible.\n`
      + `If you did not request this, contact us immediately.`
      + renderTextFooter(locale);

    return { subject: title, html: renderLayout({ title, body, locale }), text };
  }

  const title = 'Votre compte a été supprimé';
  const scopeHtml = companyDeleted
    ? `<p>L’entreprise <strong>${escapeHtml(tenantName)}</strong>, son abonnement et l’ensemble `
      + `de ses données ont également été supprimés : aucun membre ne pouvait reprendre le compte.</p>`
    : `<p>Vous n’avez plus accès à l’espace <strong>${escapeHtml(tenantName)}</strong>.</p>`;

  const body = `<p>Bonjour ${escapeHtml(firstName)},</p>`
    + `<p>Votre compte Voxo Chat a bien été supprimé. Vous ne pouvez plus vous connecter.</p>`
    + scopeHtml
    + `<p>Vos données seront effacées définitivement de nos serveurs le `
    + `<strong>${escapeHtml(purgeDate)}</strong>. Cette suppression est irréversible.</p>`
    + `<p>Si vous n’êtes pas à l’origine de cette action, contactez-nous immédiatement.</p>`;

  const scopeText = companyDeleted
    ? `L'entreprise ${tenantName}, son abonnement et l'ensemble de ses données ont également été supprimés.`
    : `Vous n'avez plus accès à l'espace ${tenantName}.`;

  const text = `Bonjour ${firstName},\n\n`
    + `Votre compte Voxo Chat a bien été supprimé. Vous ne pouvez plus vous connecter.\n`
    + `${scopeText}\n`
    + `Vos données seront effacées définitivement le ${purgeDate}. Cette suppression est irréversible.\n`
    + `Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.`
    + renderTextFooter();

  return { subject: title, html: renderLayout({ title, body, locale }), text };
}

module.exports = accountDeleted;
