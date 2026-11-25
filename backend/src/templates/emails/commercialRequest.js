const { escapeHtml, renderLayout } = require('./layout');

module.exports = (data, locale = 'fr') => {
  if (locale === 'en') {
    const product = data.productName || data.category || 'Item to look up';
    const text = [
      `New commercial request for ${data.tenantName}.`,
      `Customer: ${data.customerName}`,
      `Phone: ${data.customerPhone}`,
      data.customerEmail && `Email: ${data.customerEmail}`,
      `Product: ${product}`,
      data.quantity && `Quantity: ${data.quantity}`,
      `Reason: ${data.reason}`,
    ].filter(Boolean).join('\n');
    return {
      subject: `New commercial request — ${product}`,
      text,
      html: renderLayout({
        title: 'New commercial request',
        body: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
        locale,
      }),
    };
  }

  const product = data.productName || data.category || 'Article à rechercher';
  const text = [
    `Nouvelle demande commerciale pour ${data.tenantName}.`,
    `Client : ${data.customerName}`,
    `Téléphone : ${data.customerPhone}`,
    data.customerEmail && `E-mail : ${data.customerEmail}`,
    `Produit : ${product}`,
    data.quantity && `Quantité : ${data.quantity}`,
    `Motif : ${data.reason}`,
  ].filter(Boolean).join('\n');
  return {
    subject: `Nouvelle demande commerciale — ${product}`,
    text,
    html: renderLayout({
      title: 'Nouvelle demande commerciale',
      body: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
      locale,
    }),
  };
};
