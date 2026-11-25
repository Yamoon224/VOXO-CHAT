const { Op } = require('sequelize');
const {
  KnowledgeCollection, KnowledgeBase, KnowledgeAsset, sequelize,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const storageService = require('./storageService');
const validation = require('./catalogValidationService');
const contentService = require('./catalogProductContentService');
const partialCandidates = require('./catalogPartialCandidateService');
const reviewState = require('./catalogReviewStateService');

const PRODUCT_FIELDS = [
  'title', 'category', 'sku', 'priceAmount', 'priceCurrency', 'priceMode', 'stockStatus',
];

async function findProduct(tenantId, id, options = {}) {
  const product = await KnowledgeBase.findOne({
    where: { id, tenantId, itemType: 'product' }, ...options,
  });
  if (!product) throw new AppError('Produit introuvable.', 404, { code: 'PRODUCT_NOT_FOUND' });
  return product;
}

async function assertDraft(product, tenantId, options = {}) {
  const collection = await KnowledgeCollection.findOne({
    where: { id: product.collectionId, tenantId, status: 'draft' },
    ...options,
  });
  if (!collection) {
    throw new AppError('Restaurez ce catalogue en brouillon avant de modifier ses produits.', 409, {
      code: 'CATALOG_NOT_DRAFT',
    });
  }
  return collection;
}

async function updateProduct(tenantId, userId, productId, payload) {
  const validated = validation.validateProductUpdate(payload);
  const action = validated.action || 'save';
  return sequelize.transaction(async transaction => {
    const product = await findProduct(tenantId, productId, {
      transaction, lock: transaction.LOCK?.UPDATE,
    });
    await assertDraft(product, tenantId, { transaction });
    const changes = Object.fromEntries(PRODUCT_FIELDS
      .filter(field => validated[field] !== undefined)
      .map(field => [field, validated[field]]));
    const description = validated.description ?? product.metadata?.description ?? '';
    const specifications = validated.specifications ?? product.metadata?.specifications ?? [];
    changes.content = contentService.productContent(
      { ...product.get(), ...changes }, description, specifications
    );
    const hasAsset = !product.metadata?.missingFields?.includes('image');
    const missingFields = partialCandidates.missingFields({
      ...product.get(), ...changes, description, specifications,
    }, hasAsset);
    changes.metadata = reviewState.transitionMetadata({
      ...product.metadata, description, specifications, manuallyCorrected: true, missingFields,
      provisionalTitle: action === 'validate' ? false : product.metadata?.provisionalTitle,
    }, action, userId);
    return product.update(changes, { transaction });
  });
}

async function bulkReview(tenantId, userId, collectionId, payload = {}) {
  const action = payload.action;
  const fromStatus = reviewState.sourceStatusForAction(action);
  if (!fromStatus) reviewState.assertTransition('new', action);
  return sequelize.transaction(async transaction => {
    const collection = await KnowledgeCollection.findOne({
      where: { id: collectionId, tenantId, status: 'draft' },
      transaction, lock: transaction.LOCK?.UPDATE,
    });
    if (!collection) throw new AppError('Catalogue introuvable ou non modifiable.', 404, {
      code: 'CATALOG_NOT_DRAFT',
    });
    const products = await KnowledgeBase.findAll({
      where: { tenantId, collectionId, itemType: 'product' },
      transaction, lock: transaction.LOCK?.UPDATE,
    });
    const targets = products.filter(product => reviewState.statusOf(product.metadata) === fromStatus);
    for (const product of targets) {
      await product.update({
        metadata: reviewState.transitionMetadata(product.metadata, action, userId),
      }, { transaction });
    }
    return {
      updated: targets.length,
      fromStatus,
      toStatus: reviewState.targetStatusForAction(action),
    };
  });
}

async function deleteRows(tenantId, products) {
  const ids = products.map(product => product.id);
  if (!ids.length) return 0;
  const assets = await KnowledgeAsset.findAll({
    where: { tenantId, knowledgeBaseId: { [Op.in]: ids } }, attributes: ['storageKey'],
  });
  const storageKeys = assets.map(asset => asset.storageKey);
  const removed = await storageService.remove(storageKeys, tenantId);
  if (removed !== storageKeys.length) {
    throw new AppError('La suppression des fichiers a échoué. Réessayez.', 503, {
      code: 'CATALOG_STORAGE_DELETE_FAILED',
    });
  }
  await sequelize.transaction(transaction => KnowledgeBase.destroy({
    where: { tenantId, id: { [Op.in]: ids }, itemType: 'product' }, transaction,
  }));
  return ids.length;
}

async function deleteProduct(tenantId, productId) {
  const product = await findProduct(tenantId, productId);
  await assertDraft(product, tenantId);
  return deleteRows(tenantId, [product]);
}

async function bulkDelete(tenantId, collectionId, options = {}) {
  const collection = await KnowledgeCollection.findOne({ where: { id: collectionId, tenantId } });
  if (!collection) throw new AppError('Catalogue introuvable.', 404, { code: 'CATALOG_NOT_FOUND' });
  if (collection.status !== 'draft') {
    throw new AppError('La suppression en lot est réservée aux catalogues en brouillon.', 409, {
      code: 'CATALOG_NOT_DRAFT',
    });
  }
  const ids = [...new Set(Array.isArray(options.productIds) ? options.productIds : [])];
  if (!options.all && !ids.length) {
    throw new AppError('Sélectionnez au moins un produit.', 400, { code: 'PRODUCT_SELECTION_REQUIRED' });
  }
  const where = { tenantId, collectionId, itemType: 'product' };
  if (!options.all) where.id = { [Op.in]: ids };
  const products = await KnowledgeBase.findAll({ where });
  if (!options.all && products.length !== ids.length) {
    throw new AppError('Un ou plusieurs produits sont introuvables.', 404, { code: 'PRODUCT_NOT_FOUND' });
  }
  return deleteRows(tenantId, products);
}

async function moveProduct(tenantId, productId, collectionId) {
  const [product, collection] = await Promise.all([
    findProduct(tenantId, productId),
    KnowledgeCollection.findOne({ where: { id: collectionId, tenantId, status: 'draft' } }),
  ]);
  await assertDraft(product, tenantId);
  if (!collection) throw new AppError('Catalogue cible introuvable ou déjà publié.', 404, { code: 'CATALOG_NOT_FOUND' });
  return product.update({ collectionId, category: collection.category, isActive: false });
}

async function mergeProducts(tenantId, userId, targetId, sourceIds = []) {
  const ids = [...new Set(sourceIds)].filter(id => id !== targetId);
  const products = await KnowledgeBase.findAll({
    where: { tenantId, itemType: 'product', id: { [Op.in]: [targetId, ...ids] } },
  });
  const target = products.find(product => product.id === targetId);
  if (!target || products.length !== ids.length + 1) {
    throw new AppError('Un ou plusieurs produits sont introuvables.', 404, { code: 'PRODUCT_NOT_FOUND' });
  }
  await assertDraft(target, tenantId);
  if (products.some(product => reviewState.statusOf(product.metadata) === 'validated')) {
    throw new AppError('Rouvrez les fiches validées avant de les fusionner.', 409, {
      code: 'PRODUCT_ALREADY_VALIDATED',
    });
  }
  if (products.some(product => product.collectionId !== target.collectionId)) {
    throw new AppError('Fusionnez uniquement des produits du même catalogue.', 400, {
      code: 'PRODUCT_COLLECTION_MISMATCH',
    });
  }
  await sequelize.transaction(async transaction => {
    await target.update({
      metadata: reviewState.transitionMetadata(target.metadata, 'save', userId),
    }, { transaction });
    await KnowledgeAsset.update({ knowledgeBaseId: target.id }, {
      where: { tenantId, knowledgeBaseId: { [Op.in]: ids } }, transaction,
    });
    await KnowledgeBase.destroy({ where: { tenantId, id: { [Op.in]: ids } }, transaction });
  });
  return target.reload({ include: [{ model: KnowledgeAsset, as: 'assets', where: { tenantId }, required: false }] });
}

async function splitProduct(tenantId, userId, productId, assetIds = []) {
  const product = await findProduct(tenantId, productId);
  await assertDraft(product, tenantId);
  if (reviewState.statusOf(product.metadata) === 'validated') {
    throw new AppError('Rouvrez cette fiche avant de la séparer.', 409, {
      code: 'PRODUCT_ALREADY_VALIDATED',
    });
  }
  const assets = await KnowledgeAsset.findAll({ where: { tenantId, knowledgeBaseId: productId } });
  const selected = assets.filter(asset => assetIds.includes(asset.id));
  if (!selected.length || selected.length >= assets.length) {
    throw new AppError('Sélectionnez une partie des images à séparer.', 400, { code: 'INVALID_ASSET_SELECTION' });
  }
  return sequelize.transaction(async transaction => {
    const values = { ...product.get() };
    delete values.id;
    delete values.createdAt;
    delete values.updatedAt;
    const savedMetadata = reviewState.transitionMetadata(product.metadata, 'save', userId);
    await product.update({ metadata: savedMetadata }, { transaction });
    const copy = await KnowledgeBase.create({
      ...values, title: `${product.title} (variante)`, isActive: false,
      metadata: { ...savedMetadata, splitFrom: product.id },
    }, { transaction });
    await KnowledgeAsset.update({ knowledgeBaseId: copy.id }, {
      where: { tenantId, id: { [Op.in]: assetIds } }, transaction,
    });
    return copy;
  });
}

module.exports = {
  findProduct, updateProduct, deleteProduct, bulkDelete, moveProduct,
  mergeProducts, splitProduct, bulkReview, deleteRows, assertDraft,
};
