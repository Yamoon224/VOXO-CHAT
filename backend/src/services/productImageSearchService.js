const { Op } = require('sequelize');
const { KnowledgeBase, KnowledgeAsset } = require('../models');
const ragService = require('./ragService');
const storageService = require('./storageService');
const visionService = require('./visionService');

function parseJson(value) {
  try {
    return JSON.parse(String(value || '').replace(/^```json\s*|```$/g, '').trim());
  } catch {
    return { classification: 'out_of_scope' };
  }
}

async function describe(client, model, images) {
  const prepared = await visionService.buildUserContent(
    "Décris factuellement le produit visible : type, marque, modèle, couleur et caractéristiques. N'invente rien.",
    images
  );
  const completion = await client.chat.completions.create({
    model, messages: [{ role: 'user', content: prepared.content }], max_tokens: 250, temperature: 0,
  });
  return completion.choices[0].message.content;
}

async function loadCandidates(tenantId, searchResults) {
  const ids = searchResults.map(result => result.knowledgeId || result.item?.id).filter(Boolean);
  const where = { tenantId, itemType: 'product', isActive: true };
  if (ids.length) where.id = { [Op.in]: ids };
  const products = await KnowledgeBase.findAll({
    where,
    include: [{ model: KnowledgeAsset, as: 'assets', where: { tenantId, assetType: 'image' }, required: true }],
    limit: 3,
  });
  products.sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id));
  const candidates = [];
  for (const product of products.slice(0, 3)) {
    try {
      const asset = product.assets[0];
      candidates.push({ product, buffer: await storageService.download(asset.storageKey, tenantId) });
    } catch (error) {
      console.warn('Image produit indisponible', { productId: product.id, reason: error.message });
    }
  }
  return candidates;
}

async function compare(client, model, visitorImages, candidates, categories) {
  const content = [{
    type: 'text',
    text: `Compare le produit du visiteur aux candidats. Réponds en JSON strict : {"classification":"exact|category_only|out_of_scope","productId":null,"category":null}. exact exige une correspondance visuelle convaincante. Catégories vendues : ${categories.join(', ') || 'aucune'}.`,
  }, { type: 'text', text: 'IMAGE DU VISITEUR :' }];
  for (const image of visitorImages) {
    content.push({ type: 'image_url', image_url: { url: await visionService.toDataUrl(image) } });
  }
  for (const candidate of candidates) {
    content.push({ type: 'text', text: `CANDIDAT productId=${candidate.product.id}, ${candidate.product.title}` });
    content.push({ type: 'image_url', image_url: { url: await visionService.toDataUrl(candidate.buffer) } });
  }
  const completion = await client.chat.completions.create({
    model, messages: [{ role: 'user', content }], max_tokens: 120, temperature: 0,
    response_format: { type: 'json_object' },
  });
  return parseJson(completion.choices[0].message.content);
}

function formatPrice(product) {
  if (product.priceAmount == null || !product.priceCurrency) return null;
  const amount = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(product.priceAmount);
  return `${product.priceMode === 'starting_from' ? 'à partir de ' : ''}${amount} ${product.priceCurrency}`;
}

function exactResponse(product) {
  const price = formatPrice(product);
  if (product.stockStatus === 'in_stock' && price) return {
    response: `Oui, nous proposons « ${product.title} ». Il est disponible au prix de ${price}. Quelle quantité souhaitez-vous ?`,
    action: { stage: 'quantity', productId: product.id, reason: 'purchase' },
  };
  if (product.stockStatus === 'out_of_stock') return {
    response: `Nous vendons bien « ${product.title} », mais son stock est actuellement épuisé. Nous pouvons enregistrer une demande de réapprovisionnement et vous faire contacter par un conseiller. Indiquez votre nom et votre numéro de téléphone.`,
    action: { stage: 'contact', productId: product.id, reason: 'restock' },
  };
  return {
    response: `Nous proposons bien « ${product.title} ».${price ? ` Son prix est de ${price}.` : ''} Sa disponibilité doit être confirmée. Indiquez votre nom et votre numéro de téléphone pour être recontacté.`,
    action: { stage: 'contact', productId: product.id, reason: 'availability' },
  };
}

async function search({ client, model, tenantId, images }) {
  if (!images?.length) return null;
  const categories = await KnowledgeBase.findAll({
    where: { tenantId, itemType: 'product', isActive: true }, attributes: ['category'], group: ['category'],
  }).then(items => items.map(item => item.category).filter(Boolean));
  if (!categories.length) return null;
  const description = await describe(client, model, images);
  const results = await ragService.search(tenantId, description, 5);
  const candidates = await loadCandidates(tenantId, results);
  const match = await compare(client, model, images, candidates, categories);
  if (match.classification === 'exact') {
    const candidate = candidates.find(item => item.product.id === match.productId);
    if (candidate) return { ...exactResponse(candidate.product), product: candidate.product };
  }
  if (match.classification === 'category_only') return {
    response: `Cet article appartient à une catégorie que nous proposons${match.category ? ` (${match.category})` : ''}, mais il n’apparaît pas dans notre catalogue actuel. Nous pouvons rechercher ce modèle ou enregistrer une commande spéciale. Indiquez votre nom et votre numéro de téléphone.`,
    action: { stage: 'contact', productId: null, reason: 'special_order', category: match.category },
  };
  return null;
}

async function generateChatResponse(options) {
  const result = await search(options);
  if (!result) return null;
  return {
    response: result.response,
    sources: result.product ? [{
      id: result.product.id,
      knowledgeId: result.product.id,
      title: result.product.title,
      sourceType: result.product.sourceType,
    }] : [],
    model: options.model,
    tokensUsed: 0,
    usedVision: true,
    commercialAction: result.action,
  };
}

module.exports = {
  search, generateChatResponse, describe, loadCandidates, compare, exactResponse, formatPrice,
};
