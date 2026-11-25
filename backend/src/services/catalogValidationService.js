const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');

const STOCK_VALUES = new Set(['in_stock', 'out_of_stock', 'unknown']);
const PRICE_MODES = new Set(['fixed', 'starting_from']);

function cleanText(value, maximum) {
  if (value == null) return value;
  const cleaned = [...String(value)]
    .filter(character => {
      const code = character.charCodeAt(0);
      return code !== 127 && (code >= 32 || code === 9 || code === 10 || code === 13);
    })
    .join('')
    .trim();
  if (cleaned.length > maximum) {
    // Longueur maximale interpolée : texte résolu ici, MESSAGES[code] ne
    // portant qu'une chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
    throw new AppError(
      dynamicMessage({
        fr: `Ce champ ne peut pas dépasser ${maximum} caractères.`,
        en: `This field cannot exceed ${maximum} characters.`,
      }),
      400,
      { code: 'CATALOG_FIELD_TOO_LONG', preTranslated: true }
    );
  }
  return cleaned;
}

function validateProductUpdate(payload = {}) {
  const result = { ...payload };
  if (payload.action !== undefined && !['save', 'validate', 'reopen'].includes(payload.action)) {
    throw new AppError('Action de révision invalide.', 400, { code: 'INVALID_REVIEW_ACTION' });
  }
  if (payload.title !== undefined) result.title = cleanText(payload.title, 500);
  if (payload.category !== undefined) result.category = cleanText(payload.category, 150);
  if (payload.sku !== undefined) result.sku = cleanText(payload.sku, 100);
  if (payload.description !== undefined) result.description = cleanText(payload.description, 5000);
  if (payload.specifications !== undefined) {
    if (!Array.isArray(payload.specifications) || payload.specifications.length > 40) {
      throw new AppError('Les caractéristiques du produit sont invalides.', 400, {
        code: 'INVALID_SPECIFICATIONS',
      });
    }
    result.specifications = payload.specifications.map(item => ({
      name: cleanText(item?.name, 120),
      value: cleanText(item?.value, 500),
    })).filter(item => item.name && item.value);
  }
  if (payload.stockStatus !== undefined && !STOCK_VALUES.has(payload.stockStatus)) {
    throw new AppError('État de stock invalide.', 400, { code: 'INVALID_STOCK_STATUS' });
  }
  if (payload.priceMode !== undefined && !PRICE_MODES.has(payload.priceMode)) {
    throw new AppError('Mode de prix invalide.', 400, { code: 'INVALID_PRICE_MODE' });
  }
  if (payload.priceCurrency !== undefined) {
    result.priceCurrency = String(payload.priceCurrency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(result.priceCurrency)) {
      throw new AppError('La devise doit utiliser un code ISO à trois lettres.', 400, { code: 'INVALID_CURRENCY' });
    }
  }
  if (payload.priceAmount !== undefined && payload.priceAmount !== '') {
    result.priceAmount = Number(payload.priceAmount);
    if (!Number.isFinite(result.priceAmount) || result.priceAmount < 0) {
      throw new AppError('Le prix doit être un nombre positif.', 400, { code: 'INVALID_PRICE' });
    }
  } else if (payload.priceAmount === '') result.priceAmount = null;
  return result;
}

module.exports = { validateProductUpdate, cleanText, STOCK_VALUES, PRICE_MODES };
