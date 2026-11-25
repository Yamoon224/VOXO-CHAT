const mockKnowledgeCreate = jest.fn();
const mockKnowledgeFindAll = jest.fn();
const mockAssetCreate = jest.fn();
const mockUpload = jest.fn();

jest.mock('../models', () => ({
  KnowledgeBase: {
    create: mockKnowledgeCreate, findAll: mockKnowledgeFindAll, destroy: jest.fn(),
  },
  KnowledgeAsset: { create: mockAssetCreate, findAll: jest.fn() },
  sequelize: { transaction: jest.fn(callback => callback({ id: 'transaction' })) },
}));
jest.mock('./storageService', () => ({
  upload: mockUpload, remove: jest.fn().mockResolvedValue(0),
}));
jest.mock('./fileValidationService', () => ({}));
jest.mock('./catalogSourceAnalysisService', () => ({}));
jest.mock('./catalogCollectionService', () => ({}));

const service = require('./catalogImportService');

describe('catalogImportService partial products', () => {
  beforeEach(() => jest.clearAllMocks());

  test('conserve un candidat sans image au lieu de le supprimer', async () => {
    const candidate = {
      title: 'PC portable', priceAmount: 250000, priceCurrency: 'XOF',
      priceMode: 'fixed', specifications: [{ name: 'RAM', value: '16 Go' }],
      pageNumber: 2, sourcePages: [2], reviewRequired: true,
    };
    await expect(service.uploadCandidates('tenant-a', [candidate])).resolves.toEqual([
      expect.objectContaining({ candidate, key: null }),
    ]);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  test('crée le brouillon sans KnowledgeAsset produit quand le recadrage manque', async () => {
    const source = { id: 'source-a', metadata: {}, update: jest.fn() };
    const collection = { id: 'catalog-a', tenantId: 'tenant-a', category: 'Ordinateurs' };
    mockKnowledgeFindAll.mockResolvedValue([]);
    mockKnowledgeCreate.mockImplementation(async values => ({ id: 'product-a', ...values }));
    const products = await service.replaceProducts(collection, source, 'user-a', {
      pageCount: 4,
      products: [{
        title: 'PC portable', priceAmount: 250000, priceCurrency: 'XOF',
        priceMode: 'fixed', specifications: [{ name: 'RAM', value: '16 Go' }],
        pageNumber: 2, sourcePages: [2], reviewRequired: true,
      }],
    });
    expect(products).toHaveLength(1);
    expect(products[0].metadata).toMatchObject({
      sourceAssetId: 'source-a', sourcePage: 2,
      reviewStatus: 'new', reviewRequired: true,
      missingFields: expect.arrayContaining(['image']),
    });
    expect(mockAssetCreate).not.toHaveBeenCalled();
  });
});
