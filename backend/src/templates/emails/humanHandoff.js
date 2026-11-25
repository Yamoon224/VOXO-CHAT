const { escapeHtml, renderLayout } = require('./layout');

const REASON_LABELS_FR = {
  conseiller: 'demande de conseiller',
  commande: 'intention de commande',
  limite_ia: 'limite de l’assistant',
};

const REASON_LABELS_EN = {
  conseiller: 'agent requested',
  commande: 'order intent',
  limite_ia: 'assistant limitation',
};

module.exports = (data, locale = 'fr') => {
  if (locale === 'en') {
    const reason = REASON_LABELS_EN[data.reason] || 'human handoff';
    const text = `A human handoff is required for ${data.tenantName}.\n`
      + `Reason: ${reason}\n`
      + `Customer: ${data.customerName || 'Anonymous'}\n`
      + `Channel: ${data.channel}\n`
      + `Last message: ${data.lastMessage || '—'}\n`
      + `Open: ${data.conversationUrl}`;
    return {
      subject: `Human handoff required — ${reason}`,
      text,
      html: renderLayout({
        title: 'Human handoff required',
        body: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
        locale,
      }),
    };
  }

  const reason = REASON_LABELS_FR[data.reason] || 'reprise humaine';
  const text = `Une reprise humaine est requise pour ${data.tenantName}.\nMotif : ${reason}\nClient : ${data.customerName || 'Anonyme'}\nCanal : ${data.channel}\nDernier message : ${data.lastMessage || '—'}\nOuvrir : ${data.conversationUrl}`;
  return {
    subject: `Reprise humaine requise — ${reason}`,
    text,
    html: renderLayout({
      title: 'Reprise humaine requise',
      body: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
      locale,
    }),
  };
};
