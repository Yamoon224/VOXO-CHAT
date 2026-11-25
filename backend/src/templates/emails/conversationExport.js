const { escapeHtml, renderLayout, renderTextFooter } = require('./layout');

module.exports = (data, locale = 'fr') => {
  if (locale === 'en') {
    const title = data.conversationTitle || 'Conversation';
    const text = `Hello,\n\nPlease find attached the export of the "${title}" conversation from ${data.tenantName}.`;
    return {
      subject: `Conversation export — ${title}`,
      text: `${text}${renderTextFooter(locale)}`,
      html: renderLayout({
        title: 'Conversation export',
        body: `<p>Hello,</p><p>Please find attached the export of the <strong>${escapeHtml(title)}</strong> conversation from ${escapeHtml(data.tenantName)}.</p>`,
        locale,
      }),
    };
  }

  const title = data.conversationTitle || 'Conversation';
  const text = `Bonjour,\n\nVous trouverez en pièce jointe l’export de la conversation « ${title} » de ${data.tenantName}.`;
  return {
    subject: `Export de conversation — ${title}`,
    text: `${text}${renderTextFooter()}`,
    html: renderLayout({
      title: 'Export de conversation',
      body: `<p>Bonjour,</p><p>Vous trouverez en pièce jointe l’export de la conversation <strong>${escapeHtml(title)}</strong> de ${escapeHtml(data.tenantName)}.</p>`,
      locale,
    }),
  };
};
