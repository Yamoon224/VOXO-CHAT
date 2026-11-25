const MIN_TITLE_LENGTH = 4;

function cleanText(value, maximum = 5000) {
  if (value == null) return null;
  return [...String(value)]
    .filter(character => {
      const code = character.charCodeAt(0);
      return code !== 127 && (code >= 32 || code === 9 || code === 10);
    })
    .join('').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maximum) || null;
}

function meaningfulTitle(value) {
  const title = cleanText(value, 500);
  if (!title || title.length < MIN_TITLE_LENGTH || !/[A-Za-zÀ-ÿ]/.test(title)) return null;
  if (/^[\s=_.:;|()-]+$/.test(title)) return null;
  return title;
}

function normalizeCurrency(value, evidence = '') {
  const token = `${value || ''} ${evidence}`.toUpperCase().replace(/\s+/g, ' ');
  if (/\b(F\s*CFA|FCFA|CFA|XOF)\b/.test(token)) return 'XOF';
  const code = String(value || '').toUpperCase().trim();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function numericPrice(value) {
  if (value == null || value === '') return null;
  const normalized = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^\d,.-]/g, '').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
}

function priceFromText(text = '') {
  const preferred = String(text).split(/\r?\n/).filter(line => /prix\s*:/i.test(line));
  const lines = [...preferred, ...String(text).split(/\r?\n/)];
  for (const line of lines) {
    const match = line.match(/(\d{1,3}(?:[\s.,]\d{3})+|\d{4,})\s*(F\s*CFA|FCFA|CFA|XOF)\b/i);
    if (match) return { amount: numericPrice(match[1]), currency: normalizeCurrency(match[2]) };
  }
  return { amount: null, currency: null };
}

function fallbackTitle(text = '') {
  const brand = String(text).match(/\b(ASUS\s+Zenbook[^\n|]{0,80}|Canon\s+Pixma\s+\w+|MSI\s+Pulse[^\n|]{0,80})/i);
  if (brand) return meaningfulTitle(brand[1]);
  return String(text).split(/\r?\n/).map(line => meaningfulTitle(line)).find(line => (
    line && !/(livraison|réduction|rapport qualité|ajouter au panier|prix\s*:)/i.test(line)
  )) || null;
}

function skuToken(value) {
  let token = cleanText(value, 100);
  if (!token || token.length < 4 || token.length > 40) return null;
  if (/^CI(?=[A-Z0-9]{4,}-\d)/i.test(token)) token = `C1${token.slice(2)}`;
  if (!/[A-Za-z]/.test(token) || !/\d/.test(token) || /(?:fcfa|cfa|rera)/i.test(token)) return null;
  return /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(token) ? token : null;
}

function normalizeSku(value, title = '', ocrText = '') {
  const candidate = skuToken(value);
  const labelledLines = String(ocrText).split(/\r?\n/).filter(line => (
    /(référence|\bsku\b|code produit|marque\s*(?:&|et)\s*modèle)/i.test(line)
  ));
  if (candidate) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped, 'i').test(title) || labelledLines.some(line => new RegExp(escaped, 'i').test(line))) {
      return candidate;
    }
  }
  for (const line of labelledLines) {
    const tokens = line.match(/[A-Za-z0-9][A-Za-z0-9._/-]{3,39}/g) || [];
    const detected = tokens.map(skuToken).filter(Boolean).at(-1);
    if (detected) return detected;
  }
  const explicitTitleModel = String(title).match(/\b[A-Z][A-Z0-9]{5,}-[A-Z0-9]{4,}\b/i)?.[0];
  if (explicitTitleModel && explicitTitleModel.length >= 12) return skuToken(explicitTitleModel);
  return null;
}

function normalizeSpecifications(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map(item => ({
    name: cleanText(item?.name, 120), value: cleanText(item?.value, 500),
  })).filter(item => item.name && item.value).filter(item => {
    const key = `${item.name.toLowerCase()}:${item.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}

function normalizeProduct(raw = {}, context = {}) {
  const fallbackPrice = priceFromText(context.ocrText);
  const title = meaningfulTitle(raw.title) || fallbackTitle(context.ocrText);
  const amount = numericPrice(raw.priceAmount) ?? fallbackPrice.amount;
  const currency = normalizeCurrency(raw.priceCurrency, context.ocrText) || fallbackPrice.currency;
  const confidence = raw.confidence && typeof raw.confidence === 'object' ? raw.confidence : {};
  const reviewRequired = !title || amount == null
    || Number(confidence.title ?? 0) < context.minimumConfidence
    || Number(confidence.price ?? 0) < context.minimumConfidence;
  return {
    title,
    sku: normalizeSku(raw.sku, title, context.ocrText),
    priceAmount: amount,
    priceCurrency: currency,
    priceMode: raw.priceMode === 'starting_from' ? 'starting_from' : 'fixed',
    comparisonPriceAmount: numericPrice(raw.comparisonPriceAmount),
    description: cleanText(raw.description, 5000),
    specifications: normalizeSpecifications(raw.specifications),
    sourceRegion: raw.sourceRegion || null,
    confidence,
    evidence: raw.evidence && typeof raw.evidence === 'object' ? raw.evidence : {},
    reviewRequired,
  };
}

module.exports = {
  cleanText, meaningfulTitle, normalizeCurrency, numericPrice,
  priceFromText, fallbackTitle, skuToken, normalizeSku,
  normalizeSpecifications, normalizeProduct,
};
