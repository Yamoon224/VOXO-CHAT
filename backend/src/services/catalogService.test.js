const mockCollectionCreate = jest.fn();
const mockCollectionFindAll = jest.fn();
const mockCollectionFindOne = jest.fn();
const mockAssetFindOne = jest.fn();
const mockSignedUrl = jest.fn();
const mockKnowledgeUpdate = jest.fn();
const mockKnowledgeFindAll = jest.fn();
const mockTransaction = jest.fn(callback => callback({ id: 'transaction' }));
const mockAssertQuota = jest.fn();
const mockIndexAsync = jest.fn();

jest.mock('../models', () => ({
  KnowledgeCollection: {
    create: mockCollectionCreate, findAll: mockCollectionFindAll, findOne: mockCollectionFindOne,
  },
  KnowledgeBase: { update: mockKnowledgeUpdate, findAll: mockKnowledgeFindAll },
  KnowledgeAsset: { findOne: mockAssetFindOne },
  sequelize: { transaction: mockTransaction },
}));
jest.mock('./storageService', () => ({ createSignedUrl: mockSignedUrl }));
jest.mock('./pdfEmbeddedImageService', () => ({}));
jest.mock('./knowledgeIngestionService', () => ({ indexAsync: mockIndexAsync }));
jest.mock('./quotaService', () => ({ assertCanCreateDocuments: mockAssertQuota }));

const service = require('./catalogService');

describe('catalogService tenant isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('crée la collection dans le tenant authentifié', async () => {
    mockCollectionCreate.mockResolvedValue({ id: 'c1' });
    await service.createCollection('tenant-a', 'user-a', {
      name: "Catalogue'; DROP TABLE users; --", category: 'Ordinateurs',
    });
    expect(mockCollectionCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a', createdBy: 'user-a', status: 'draft',
    }));
  });

  test('liste produits et assets avec le tenant et exclut la clé de stockage', async () => {
    mockCollectionFindAll.mockResolvedValue([]);
    await service.listCollections('tenant-a');
    const query = mockCollectionFindAll.mock.calls[0][0];
    expect(query.where).toEqual({ tenantId: 'tenant-a' });
    expect(query.include[0].where).toMatchObject({ tenantId: 'tenant-a' });
    expect(query.include[0].include[0]).toMatchObject({
      where: { tenantId: 'tenant-a' }, attributes: { exclude: ['storageKey'] },
    });
  });

  test('normalise le statut de révision des anciens brouillons', async () => {
    const product = {
      metadata: { manuallyCorrected: true, reviewRequired: true },
      setDataValue: jest.fn(function setDataValue(key, value) { this[key] = value; }),
    };
    mockCollectionFindAll.mockResolvedValue([{ products: [product] }]);
    await service.listCollections('tenant-a');
    expect(product.metadata.reviewStatus).toBe('saved');
  });

  test('signe uniquement un asset appartenant au tenant', async () => {
    mockAssetFindOne.mockResolvedValue({ storageKey: 'tenant-a/knowledge/image.png' });
    mockSignedUrl.mockResolvedValue('signed');
    await expect(service.assetUrl('tenant-a', 'asset-a')).resolves.toBe('signed');
    expect(mockAssetFindOne).toHaveBeenCalledWith({ where: { id: 'asset-a', tenantId: 'tenant-a' } });
    expect(mockSignedUrl).toHaveBeenCalledWith('tenant-a/knowledge/image.png', 'tenant-a');
  });

  test('archive le catalogue du tenant et masque immédiatement ses produits', async () => {
    const collection = {
      status: 'published', update: jest.fn().mockResolvedValue(),
      reload: jest.fn().mockResolvedValue({ status: 'archived' }),
    };
    mockCollectionFindOne.mockResolvedValue(collection);
    await expect(service.archiveCollection('tenant-a', 'catalog-a'))
      .resolves.toEqual({ status: 'archived' });
    expect(mockCollectionFindOne).toHaveBeenCalledWith({
      where: { id: 'catalog-a', tenantId: 'tenant-a' },
    });
    expect(mockKnowledgeUpdate).toHaveBeenCalledWith({ isActive: false }, expect.objectContaining({
      where: { tenantId: 'tenant-a', collectionId: 'catalog-a', itemType: 'product' },
    }));
  });

  test('bloque la publication et retourne le nombre de fiches à valider', async () => {
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
    mockKnowledgeFindAll.mockResolvedValue([
      { metadata: { reviewStatus: 'new' } },
      { metadata: { reviewStatus: 'saved' } },
      { metadata: { reviewStatus: 'validated' } },
    ]);
    await expect(service.publishCollection({ id: 'tenant-a' }, 'catalog-a'))
      .rejects.toMatchObject({
        statusCode: 409, code: 'CATALOG_REVIEW_REQUIRED',
        details: { newCount: 1, savedCount: 1 },
      });
  });

  test('publie lorsque toutes les fiches sont validées', async () => {
    const collection = {
      status: 'draft', update: jest.fn().mockResolvedValue(),
      reload: jest.fn().mockResolvedValue({ status: 'published' }),
    };
    const products = [
      { id: 'p1', metadata: { reviewStatus: 'validated' } },
      { id: 'p2', metadata: { reviewStatus: 'validated' } },
    ];
    mockCollectionFindOne.mockResolvedValue(collection);
    mockKnowledgeFindAll.mockResolvedValue(products);
    await expect(service.publishCollection({ id: 'tenant-a' }, 'catalog-a'))
      .resolves.toEqual({ status: 'published' });
    expect(mockAssertQuota).toHaveBeenCalledWith({ id: 'tenant-a' }, 2);
    expect(mockIndexAsync).toHaveBeenCalledTimes(2);
  });
});
