const catalogService = require('../services/catalogService');
const { successResponse } = require('../utils/responseUtils');

async function createCollection(req, res, next) {
  try {
    const collection = await catalogService.createCollection(req.tenant.id, req.user.id, req.body);
    successResponse(res, collection, 'Catalogue créé.', 201);
  } catch (error) { next(error); }
}

async function listCollections(req, res, next) {
  try {
    const collections = await catalogService.listCollections(req.tenant.id);
    successResponse(res, collections, 'Catalogues récupérés.');
  } catch (error) { next(error); }
}

async function updateCollection(req, res, next) {
  try {
    const collection = await catalogService.updateCollection(req.tenant.id, req.params.id, req.body);
    successResponse(res, collection, 'Catalogue mis à jour.');
  } catch (error) { next(error); }
}

async function archiveCollection(req, res, next) {
  try {
    const collection = await catalogService.archiveCollection(req.tenant.id, req.params.id);
    successResponse(res, collection, 'Catalogue archivé.');
  } catch (error) { next(error); }
}

async function restoreCollection(req, res, next) {
  try {
    const collection = await catalogService.restoreCollection(req.tenant.id, req.params.id);
    successResponse(res, collection, 'Catalogue restauré en brouillon.');
  } catch (error) { next(error); }
}

async function purgeCollection(req, res, next) {
  try {
    await catalogService.purgeCollection(req.tenant.id, req.params.id, req.body?.confirmationName);
    successResponse(res, null, 'Catalogue supprimé définitivement.');
  } catch (error) { next(error); }
}

async function importCatalogFile(req, res, next) {
  try {
    const result = await catalogService.importFile(req.tenant, req.user, req.params.id, req.file);
    successResponse(res, result, `${result.products.length} produit(s) détecté(s).`, 201);
  } catch (error) { next(error); }
}

async function reanalyzeSource(req, res, next) {
  try {
    const result = await catalogService.reanalyzeSource(
      req.tenant, req.user, req.params.id, req.params.assetId
    );
    successResponse(res, result, `${result.products.length} produit(s) réanalysé(s).`);
  } catch (error) { next(error); }
}

async function updateProduct(req, res, next) {
  try {
    const product = await catalogService.updateProduct(
      req.tenant.id, req.user.id, req.params.productId, req.body
    );
    successResponse(res, product, 'Produit mis à jour.');
  } catch (error) { next(error); }
}

async function publishCollection(req, res, next) {
  try {
    const collection = await catalogService.publishCollection(req.tenant, req.params.id);
    successResponse(res, collection, 'Catalogue publié.');
  } catch (error) { next(error); }
}

async function getAssetUrl(req, res, next) {
  try {
    const url = await catalogService.assetUrl(req.tenant.id, req.params.assetId);
    successResponse(res, { url, expiresInSeconds: 300 }, 'Aperçu généré.');
  } catch (error) { next(error); }
}

async function deleteProduct(req, res, next) {
  try {
    await catalogService.deleteProduct(req.tenant.id, req.params.productId);
    successResponse(res, null, 'Produit supprimé.');
  } catch (error) { next(error); }
}

async function bulkDeleteProducts(req, res, next) {
  try {
    const deleted = await catalogService.bulkDeleteProducts(
      req.tenant.id, req.params.id, req.body || {}
    );
    successResponse(res, { deleted }, `${deleted} produit(s) supprimé(s).`);
  } catch (error) { next(error); }
}

async function bulkReviewProducts(req, res, next) {
  try {
    const result = await catalogService.bulkReviewProducts(
      req.tenant.id, req.user.id, req.params.id, req.body || {}
    );
    successResponse(res, result, `${result.updated} fiche(s) mise(s) à jour.`);
  } catch (error) { next(error); }
}

async function moveProduct(req, res, next) {
  try {
    const product = await catalogService.moveProduct(req.tenant.id, req.params.productId, req.body.collectionId);
    successResponse(res, product, 'Produit déplacé.');
  } catch (error) { next(error); }
}

async function mergeProducts(req, res, next) {
  try {
    const product = await catalogService.mergeProducts(
      req.tenant.id, req.user.id, req.body.targetId, req.body.sourceIds
    );
    successResponse(res, product, 'Produits fusionnés.');
  } catch (error) { next(error); }
}

async function splitProduct(req, res, next) {
  try {
    const product = await catalogService.splitProduct(
      req.tenant.id, req.user.id, req.params.productId, req.body.assetIds
    );
    successResponse(res, product, 'Produit séparé.');
  } catch (error) { next(error); }
}

module.exports = {
  createCollection, listCollections, updateCollection,
  archiveCollection, restoreCollection, purgeCollection,
  importCatalogFile, reanalyzeSource,
  updateProduct, deleteProduct, bulkDeleteProducts,
  bulkReviewProducts,
  moveProduct, mergeProducts, splitProduct, publishCollection, getAssetUrl,
};
