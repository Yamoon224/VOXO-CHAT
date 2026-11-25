const path = require('path');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const {
  KnowledgeBase, KnowledgeAsset, sequelize,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const fileValidation = require('./fileValidationService');
const storageService = require('./storageService');
const analyzer = require('./catalogSourceAnalysisService');
const collectionService = require('./catalogCollectionService');
const contentService = require('./catalogProductContentService');
const partialCandidates = require('./catalogPartialCandidateService');

async function persistSource(tenantId, collectionId, file) {
  const key = await storageService.upload(tenantId, 'knowledge', file.buffer, {
    filename: file.filename, mimeType: file.mimeType, extension: file.extension,
  });
  try {
    return await KnowledgeAsset.create({
      tenantId, collectionId, knowledgeBaseId: null, storageKey: key,
      originalName: file.filename, mimeType: file.mimeType, sizeBytes: file.size,
      assetType: 'source',
      metadata: { importStatus: 'analyzing', extractionVersion: 2 },
    });
  } catch (error) {
    await storageService.remove(key, tenantId);
    throw error;
  }
}

async function uploadCandidates(tenantId, candidates) {
  const uploaded = [];
  const queue = candidates.map((candidate, index) => ({ candidate, index }));
  const worker = async () => {
    while (queue.length) {
      const { candidate, index } = queue.shift();
      const filename = `produit-${index + 1}.png`;
      if (!candidate.assetBuffer) {
        uploaded.push({ candidate, index, filename, key: null });
        continue;
      }
      const key = await storageService.upload(tenantId, 'knowledge', candidate.assetBuffer, {
        filename, mimeType: 'image/png', extension: '.png',
      });
      uploaded.push({ candidate, index, filename, key });
    }
  };
  try {
    await Promise.all([worker(), worker()]);
    return uploaded.sort((left, right) => left.index - right.index);
  } catch (error) {
    await storageService.remove(uploaded.map(item => item.key).filter(Boolean), tenantId);
    throw error;
  }
}

function productValues(collection, source, userId, item, generationId) {
  const candidate = item.candidate;
  const metadata = {
    catalogDraft: true,
    description: candidate.description || '',
    specifications: candidate.specifications || [],
    comparisonPriceAmount: candidate.comparisonPriceAmount,
    sourceAssetId: source.id,
    sourcePage: candidate.pageNumber,
    sourcePages: candidate.sourcePages,
    sourceRegion: candidate.sourceRegion,
    extraction: candidate.extraction,
    fieldConfidence: candidate.confidence,
    evidence: candidate.evidence,
    reviewRequired: true,
    reviewStatus: 'new',
    provisionalTitle: candidate.provisionalTitle,
    missingFields: candidate.missingFields || [],
    generationId,
  };
  const product = {
    tenantId: collection.tenantId, collectionId: collection.id, itemType: 'product',
    category: collection.category, title: candidate.title,
    sku: candidate.sku, priceAmount: candidate.priceAmount,
    priceCurrency: candidate.priceCurrency, priceMode: candidate.priceMode,
    stockStatus: 'unknown', sourceType: 'upload', isActive: false,
    createdBy: userId, metadata,
  };
  product.content = contentService.productContent(
    product, candidate.description, candidate.specifications
  );
  return product;
}

async function oldProductsForSource(tenantId, collectionId, sourceId) {
  const products = await KnowledgeBase.findAll({
    where: { tenantId, collectionId, itemType: 'product' },
  });
  return products.filter(product => product.metadata?.sourceAssetId === sourceId);
}

async function replaceProducts(collection, source, userId, analysis) {
  const valid = partialCandidates.prepareCandidates(analysis.products);
  if (!valid.length) {
    throw new AppError('Aucune donnée produit exploitable n’a été détectée.', 422, {
      code: 'CATALOG_EMPTY',
    });
  }
  const uploaded = await uploadCandidates(collection.tenantId, valid);
  const generationId = uuidv4();
  const oldProducts = await oldProductsForSource(collection.tenantId, collection.id, source.id);
  const oldIds = oldProducts.map(product => product.id);
  const oldAssets = oldIds.length ? await KnowledgeAsset.findAll({
    where: { tenantId: collection.tenantId, knowledgeBaseId: { [Op.in]: oldIds } },
    attributes: ['storageKey'],
  }) : [];
  try {
    const created = await sequelize.transaction(async transaction => {
      const products = [];
      for (const item of uploaded) {
        const product = await KnowledgeBase.create(
          productValues(collection, source, userId, item, generationId), { transaction }
        );
        if (item.key) {
          await KnowledgeAsset.create({
            tenantId: collection.tenantId, knowledgeBaseId: product.id, collectionId: null,
            storageKey: item.key, originalName: item.filename, mimeType: 'image/png',
            sizeBytes: item.candidate.assetBuffer.length, assetType: 'image',
            metadata: { sourceAssetId: source.id, sourcePage: item.candidate.pageNumber },
          }, { transaction });
        }
        products.push(product);
      }
      if (oldIds.length) {
        await KnowledgeBase.destroy({
          where: { tenantId: collection.tenantId, id: { [Op.in]: oldIds } }, transaction,
        });
      }
      await source.update({
        metadata: {
          ...source.metadata,
          importStatus: 'complete',
          pageCount: analysis.pageCount,
          productCount: products.length,
          generationId,
          analyzedAt: new Date().toISOString(),
        },
      }, { transaction });
      return products;
    });
    await storageService.remove(oldAssets.map(asset => asset.storageKey), collection.tenantId);
    return created;
  } catch (error) {
    await storageService.remove(uploaded.map(item => item.key).filter(Boolean), collection.tenantId);
    throw error;
  }
}

async function analyzeSource(collection, source, userId, file) {
  try {
    const analysis = await analyzer.analyze(file);
    return await replaceProducts(collection, source, userId, analysis);
  } catch (error) {
    await source.update({
      metadata: {
        ...source.metadata,
        importStatus: 'failed',
        errorCode: error.code || 'CATALOG_ANALYSIS_FAILED',
        failedAt: new Date().toISOString(),
      },
    }).catch(() => {});
    throw error;
  }
}

async function importFile(tenant, user, collectionId, uploadedFile) {
  const collection = await collectionService.findCollection(tenant.id, collectionId);
  if (collection.status !== 'draft') {
    throw new AppError('Ce catalogue n’est pas en brouillon.', 409, { code: 'CATALOG_NOT_DRAFT' });
  }
  if (!storageService.isConfigured()) {
    throw new AppError("Le stockage d'images n'est pas configuré.", 503, { code: 'STORAGE_NOT_CONFIGURED' });
  }
  const validated = fileValidation.validateUpload(
    uploadedFile.buffer, uploadedFile.originalname, uploadedFile.mimetype, 'knowledge'
  );
  if (validated.category !== 'image' && validated.extension !== '.pdf') {
    throw new AppError('Un catalogue accepte uniquement des images ou des PDF.', 400, {
      code: 'CATALOG_FORMAT_UNSUPPORTED',
    });
  }
  const file = { ...validated, buffer: uploadedFile.buffer };
  const source = await persistSource(tenant.id, collection.id, file);
  const products = await analyzeSource(collection, source, user.id, file);
  const reviewCount = products.filter(product => product.metadata?.reviewRequired).length;
  const errors = reviewCount ? [{
    code: 'CATALOG_REVIEW_REQUIRED',
    message: `${reviewCount} fiche(s) partielle(s) doivent être vérifiées.`,
  }] : [];
  return { source: source.toPublicJSON(), products, errors };
}

async function reanalyze(tenant, user, collectionId, sourceId) {
  const collection = await collectionService.findCollection(tenant.id, collectionId);
  if (collection.status !== 'draft') {
    throw new AppError('Restaurez ce catalogue en brouillon avant de le réanalyser.', 409, {
      code: 'CATALOG_NOT_DRAFT',
    });
  }
  const source = await KnowledgeAsset.findOne({
    where: { id: sourceId, tenantId: tenant.id, collectionId, assetType: 'source' },
  });
  if (!source) throw new AppError('Fichier source introuvable.', 404, { code: 'SOURCE_NOT_FOUND' });
  const buffer = await storageService.download(source.storageKey, tenant.id);
  const extension = path.extname(source.originalName).toLowerCase();
  const file = {
    buffer, filename: source.originalName, mimeType: source.mimeType,
    extension, category: extension === '.pdf' ? 'document' : 'image', size: buffer.length,
  };
  await source.update({ metadata: { ...source.metadata, importStatus: 'analyzing' } });
  const products = await analyzeSource(collection, source, user.id, file);
  return { source: source.toPublicJSON(), products };
}

module.exports = {
  importFile, reanalyze, persistSource, analyzeSource, replaceProducts,
  productValues, oldProductsForSource, uploadCandidates,
};
