const { Op } = require('sequelize');
const { KnowledgeCollection, KnowledgeBase, KnowledgeAsset, sequelize } = require('../models');
const config = require('../config/config');
const storageService = require('./storageService');

async function purgeCollection(collection) {
  const products = await KnowledgeBase.findAll({
    where: { tenantId: collection.tenantId, collectionId: collection.id },
    attributes: ['id'],
  });
  const productIds = products.map(product => product.id);
  const ownerFilters = [{ collectionId: collection.id }];
  if (productIds.length) ownerFilters.push({ knowledgeBaseId: { [Op.in]: productIds } });
  const assets = await KnowledgeAsset.findAll({
    where: { tenantId: collection.tenantId, [Op.or]: ownerFilters },
    attributes: ['storageKey'],
  });
  await storageService.remove(assets.map(asset => asset.storageKey), collection.tenantId);
  await sequelize.transaction(async transaction => {
    await KnowledgeBase.destroy({
      where: { tenantId: collection.tenantId, collectionId: collection.id }, transaction,
    });
    await KnowledgeCollection.destroy({
      where: { tenantId: collection.tenantId, id: collection.id, status: 'draft' }, transaction,
    });
  });
  return 1;
}

async function purgeAbandoned() {
  const threshold = new Date(Date.now() - config.catalog.draftTtlMs);
  const collections = await KnowledgeCollection.findAll({
    where: { status: 'draft', updatedAt: { [Op.lt]: threshold } },
  });
  let purged = 0;
  for (const collection of collections) purged += await purgeCollection(collection);
  return purged;
}

module.exports = { purgeAbandoned, purgeCollection };
