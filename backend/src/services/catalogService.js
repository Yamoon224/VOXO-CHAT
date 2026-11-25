const collections = require('./catalogCollectionService');
const products = require('./catalogProductService');
const imports = require('./catalogImportService');
const content = require('./catalogProductContentService');

module.exports = {
  createCollection: collections.createCollection,
  listCollections: collections.listCollections,
  updateCollection: collections.updateCollection,
  archiveCollection: collections.archiveCollection,
  restoreCollection: collections.restoreCollection,
  purgeCollection: collections.purgeCollection,
  publishCollection: collections.publishCollection,
  assetUrl: collections.assetUrl,
  importFile: imports.importFile,
  reanalyzeSource: imports.reanalyze,
  updateProduct: products.updateProduct,
  deleteProduct: products.deleteProduct,
  bulkDeleteProducts: products.bulkDelete,
  bulkReviewProducts: products.bulkReview,
  moveProduct: products.moveProduct,
  mergeProducts: products.mergeProducts,
  splitProduct: products.splitProduct,
  productContent: content.productContent,
};
