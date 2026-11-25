const { Op } = require('sequelize');
const {
  KnowledgeCollection, KnowledgeBase, KnowledgeAsset, sequelize,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');
const storageService = require('./storageService');
const quotaService = require('./quotaService');
const knowledgeIngestionService = require('./knowledgeIngestionService');
const validation = require('./catalogValidationService');
const contentService = require('./catalogProductContentService');
const reviewState = require('./catalogReviewStateService');

async function findCollection(tenantId, id, options = {}) {
  const collection = await KnowledgeCollection.findOne({ where: { id, tenantId }, ...options });
  if (!collection) throw new AppError('Catalogue introuvable.', 404, { code: 'CATALOG_NOT_FOUND' });
  return collection;
}

async function createCollection(tenantId, userId, payload = {}) {
  const name = validation.cleanText(payload.name, 255);
  const category = validation.cleanText(payload.category, 150);
  if (!name || !category) {
    throw new AppError('Le nom et la catégorie du catalogue sont obligatoires.', 400, {
      code: 'CATALOG_FIELDS_REQUIRED',
    });
  }
  return KnowledgeCollection.create({ tenantId, createdBy: userId, name, category, status: 'draft' });
}

async function listCollections(tenantId) {
  const collections = await KnowledgeCollection.findAll({
    where: { tenantId }, order: [['updatedAt', 'DESC']],
    include: [
      {
        model: KnowledgeBase, as: 'products', where: { tenantId, itemType: 'product' }, required: false,
        include: [{
          model: KnowledgeAsset, as: 'assets', where: { tenantId }, required: false,
          attributes: { exclude: ['storageKey'] },
        }],
      },
      {
        model: KnowledgeAsset, as: 'sources', where: { tenantId, assetType: 'source' }, required: false,
        attributes: { exclude: ['storageKey'] },
      },
    ],
  });
  for (const collection of collections) {
    for (const product of collection.products || []) {
      const metadata = { ...product.metadata, reviewStatus: reviewState.statusOf(product.metadata) };
      if (product.setDataValue) product.setDataValue('metadata', metadata);
      else product.metadata = metadata;
    }
  }
  return collections;
}

async function updateCollection(tenantId, id, payload = {}) {
  const collection = await findCollection(tenantId, id);
  const changes = {};
  if (payload.name !== undefined) changes.name = validation.cleanText(payload.name, 255);
  if (payload.category !== undefined) {
    if (collection.status !== 'draft') {
      throw new AppError('Archivez puis restaurez ce catalogue avant de changer sa catégorie.', 409, {
        code: 'CATALOG_CATEGORY_LOCKED',
      });
    }
    changes.category = validation.cleanText(payload.category, 150);
  }
  if (!changes.name && payload.name !== undefined) {
    throw new AppError('Le nom du catalogue est obligatoire.', 400, { code: 'CATALOG_NAME_REQUIRED' });
  }
  await sequelize.transaction(async transaction => {
    await collection.update(changes, { transaction });
    if (changes.category) {
      const products = await KnowledgeBase.findAll({
        where: { tenantId, collectionId: id, itemType: 'product' }, transaction,
      });
      for (const product of products) {
        await product.update({
          category: changes.category,
          content: contentService.productContent(
            { ...product.get(), category: changes.category },
            product.metadata?.description || '',
            product.metadata?.specifications || []
          ),
        }, { transaction });
      }
    }
  });
  return collection.reload();
}

async function archiveCollection(tenantId, id) {
  const collection = await findCollection(tenantId, id);
  if (collection.status === 'archived') return collection;
  await sequelize.transaction(async transaction => {
    await KnowledgeBase.update({ isActive: false }, {
      where: { tenantId, collectionId: id, itemType: 'product' }, transaction,
    });
    await collection.update({ status: 'archived' }, { transaction });
  });
  return collection.reload();
}

async function restoreCollection(tenantId, id) {
  const collection = await findCollection(tenantId, id);
  if (collection.status !== 'archived') {
    throw new AppError('Seul un catalogue archivé peut être restauré.', 409, {
      code: 'CATALOG_NOT_ARCHIVED',
    });
  }
  await collection.update({ status: 'draft' });
  return collection;
}

async function purgeCollection(tenantId, id, confirmationName) {
  const collection = await findCollection(tenantId, id);
  if (collection.status !== 'archived') {
    throw new AppError('Archivez le catalogue avant sa suppression définitive.', 409, {
      code: 'CATALOG_NOT_ARCHIVED',
    });
  }
  if (String(confirmationName || '').trim() !== collection.name) {
    throw new AppError('Le nom de confirmation ne correspond pas au catalogue.', 400, {
      code: 'CATALOG_CONFIRMATION_MISMATCH',
    });
  }
  const products = await KnowledgeBase.findAll({
    where: { tenantId, collectionId: id, itemType: 'product' }, attributes: ['id'],
  });
  const ids = products.map(product => product.id);
  const assets = await KnowledgeAsset.findAll({
    where: {
      tenantId,
      [Op.or]: [
        { collectionId: id },
        ...(ids.length ? [{ knowledgeBaseId: { [Op.in]: ids } }] : []),
      ],
    },
    attributes: ['storageKey'],
  });
  const storageKeys = assets.map(asset => asset.storageKey);
  const removed = await storageService.remove(storageKeys, tenantId);
  if (removed !== storageKeys.length) {
    throw new AppError('La suppression des fichiers du catalogue a échoué. Réessayez.', 503, {
      code: 'CATALOG_STORAGE_DELETE_FAILED',
    });
  }
  await sequelize.transaction(async transaction => {
    await KnowledgeBase.destroy({ where: { tenantId, collectionId: id }, transaction });
    await KnowledgeAsset.destroy({ where: { tenantId, collectionId: id }, transaction });
    await KnowledgeCollection.destroy({ where: { tenantId, id }, transaction });
  });
  return { deleted: true };
}

async function publishCollection(tenant, id) {
  const collection = await findCollection(tenant.id, id);
  if (collection.status !== 'draft') {
    throw new AppError('Seul un catalogue en brouillon peut être publié.', 409, { code: 'CATALOG_NOT_DRAFT' });
  }
  const products = await KnowledgeBase.findAll({
    where: { tenantId: tenant.id, collectionId: id, itemType: 'product' },
  });
  if (!products.length) throw new AppError('Ajoutez au moins un produit avant publication.', 409, { code: 'CATALOG_EMPTY' });
  const newCount = products.filter(product => reviewState.statusOf(product.metadata) === 'new').length;
  const savedCount = products.filter(product => reviewState.statusOf(product.metadata) === 'saved').length;
  if (newCount || savedCount) {
    // Compteurs interpolés : texte résolu ici, MESSAGES[code] ne portant qu'une
    // chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
    throw new AppError(
      dynamicMessage({
        fr: `${newCount} nouvelle(s) fiche(s) et ${savedCount} fiche(s) enregistrée(s) restent à valider.`,
        en: `${newCount} new item(s) and ${savedCount} saved item(s) still need review.`,
      }),
      409,
      { code: 'CATALOG_REVIEW_REQUIRED', preTranslated: true, details: { newCount, savedCount } }
    );
  }
  await quotaService.assertCanCreateDocuments(tenant, products.length);
  await sequelize.transaction(async transaction => {
    await KnowledgeBase.update({ isActive: true }, {
      where: { tenantId: tenant.id, collectionId: id }, transaction,
    });
    await collection.update({ status: 'published' }, { transaction });
  });
  products.forEach(product => knowledgeIngestionService.indexAsync(product));
  return collection.reload();
}

async function assetUrl(tenantId, assetId) {
  const asset = await KnowledgeAsset.findOne({ where: { id: assetId, tenantId } });
  if (!asset) throw new AppError('Fichier introuvable.', 404, { code: 'ASSET_NOT_FOUND' });
  return storageService.createSignedUrl(asset.storageKey, tenantId);
}

module.exports = {
  findCollection, createCollection, listCollections, updateCollection,
  archiveCollection, restoreCollection, purgeCollection, publishCollection, assetUrl,
};
