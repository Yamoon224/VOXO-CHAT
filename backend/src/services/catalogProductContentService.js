function specificationsText(specifications = []) {
  return (Array.isArray(specifications) ? specifications : [])
    .filter(item => item?.name && item?.value)
    .map(item => `${item.name} : ${item.value}`)
    .join('\n');
}

function productContent(product, description = '', specifications = []) {
  const price = product.priceAmount != null
    ? `${product.priceMode === 'starting_from' ? 'À partir de ' : ''}${product.priceAmount} ${product.priceCurrency || ''}`.trim()
    : 'Prix à confirmer';
  return [
    `Produit : ${product.title}`,
    product.category && `Catégorie : ${product.category}`,
    product.sku && `Référence : ${product.sku}`,
    `Prix : ${price}`,
    `Disponibilité : ${product.stockStatus || 'unknown'}`,
    description,
    specificationsText(specifications),
  ].filter(Boolean).join('\n');
}

module.exports = { productContent, specificationsText };
