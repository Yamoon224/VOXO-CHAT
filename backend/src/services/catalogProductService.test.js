const mockCollectionFindOne = jest.fn();
const mockKnowledgeFindAll = jest.fn();
const mockKnowledgeFindOne = jest.fn();
const mockKnowledgeDestroy = jest.fn();
const mockKnowledgeCreate = jest.fn();
const mockAssetFindAll = jest.fn();
const mockAssetUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('../models', () => ({
  KnowledgeCollection: { findOne: mockCollectionFindOne },
  KnowledgeBase: {
    create: mockKnowledgeCreate, findAll: mockKnowledgeFindAll,
    findOne: mockKnowledgeFindOne, destroy: mockKnowledgeDestroy,
  },
  KnowledgeAsset: { findAll: mockAssetFindAll, update: mockAssetUpdate },
  sequelize: { transaction: jest.fn(callback => callback({ id: 'transaction' })) },
}));
jest.mock('./storageService', () => ({ remove: mockRemove }));

const service = require('./catalogProductService');

describe('catalogProductService bulk deletion', () => {
  beforeEach(() => jest.clearAllMocks());

  test('supprime uniquement la sélection du catalogue et du tenant', async () => {
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
    mockKnowledgeFindAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    mockAssetFindAll.mockResolvedValue([{ storageKey: 'tenant-a/product.png' }]);
    mockRemove.mockResolvedValue(1);
    mockKnowledgeDestroy.mockResolvedValue(2);

    await expect(service.bulkDelete('tenant-a', 'catalog-a', {
      productIds: ['p1', 'p2', 'p2'],
    })).resolves.toBe(2);

    expect(mockKnowledgeFindAll.mock.calls[0][0].where).toMatchObject({
      tenantId: 'tenant-a', collectionId: 'catalog-a', itemType: 'product',
    });
    expect(mockRemove).toHaveBeenCalledWith(['tenant-a/product.png'], 'tenant-a');
  });

  test('refuse toute suppression en lot hors brouillon', async () => {
    mockCollectionFindOne.mockResolvedValue({ status: 'published' });
    await expect(service.bulkDelete('tenant-a', 'catalog-a', { all: true }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CATALOG_NOT_DRAFT' });
    expect(mockKnowledgeFindAll).not.toHaveBeenCalled();
  });

  test('conserve les produits si le stockage privé ne peut pas être nettoyé', async () => {
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
    mockKnowledgeFindAll.mockResolvedValue([{ id: 'p1' }]);
    mockAssetFindAll.mockResolvedValue([{ storageKey: 'tenant-a/product.png' }]);
    mockRemove.mockResolvedValue(0);
    await expect(service.bulkDelete('tenant-a', 'catalog-a', { all: true }))
      .rejects.toMatchObject({ statusCode: 503, code: 'CATALOG_STORAGE_DELETE_FAILED' });
    expect(mockKnowledgeDestroy).not.toHaveBeenCalled();
  });
});

describe('catalogProductService review', () => {
  const product = () => ({
    id: 'p1', collectionId: 'catalog-a', title: 'PC portable', sku: null,
    priceAmount: null, priceCurrency: null, stockStatus: 'unknown',
    metadata: { reviewRequired: true, missingFields: ['image', 'price'] },
    get() { return { ...this }; },
    update: jest.fn(async changes => changes),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
  });

  test('un simple enregistrement conserve la validation requise', async () => {
    const current = product();
    mockKnowledgeFindOne.mockResolvedValue(current);
    const result = await service.updateProduct('tenant-a', 'user-a', 'p1', {
      action: 'save', description: 'Description corrigée',
    });
    expect(result.metadata).toMatchObject({
      reviewStatus: 'saved', reviewRequired: true, manuallyCorrected: true,
      validatedAt: null, validatedBy: null,
    });
  });

  test('une validation explicite conserve les champs vides et trace son auteur', async () => {
    const current = product();
    mockKnowledgeFindOne.mockResolvedValue(current);
    const result = await service.updateProduct('tenant-a', 'user-a', 'p1', {
      action: 'validate', title: 'PC portable', priceAmount: '',
    });
    expect(result.metadata).toMatchObject({
      reviewStatus: 'validated', reviewRequired: false,
      provisionalTitle: false, validatedBy: 'user-a',
    });
    expect(result.metadata.validatedAt).toEqual(expect.any(String));
  });

  test('refuse un nouvel enregistrement après validation puis autorise la réouverture', async () => {
    const current = product();
    current.metadata = { reviewStatus: 'validated', validatedAt: 'date', validatedBy: 'user-a' };
    mockKnowledgeFindOne.mockResolvedValue(current);
    await expect(service.updateProduct('tenant-a', 'user-a', 'p1', { action: 'save' }))
      .rejects.toMatchObject({ code: 'PRODUCT_ALREADY_VALIDATED' });
    const reopened = await service.updateProduct('tenant-a', 'user-b', 'p1', { action: 'reopen' });
    expect(reopened.metadata).toMatchObject({
      reviewStatus: 'saved', reviewRequired: true, validatedAt: null, validatedBy: null,
    });
  });
});

describe('catalogProductService global review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
  });

  test('applique seulement la transition correspondant à l onglet et reste idempotent', async () => {
    const product = {
      metadata: { reviewStatus: 'saved' },
      update: jest.fn(async function update(changes) {
        this.metadata = changes.metadata;
        return this;
      }),
    };
    mockKnowledgeFindAll.mockResolvedValue([product]);
    await expect(service.bulkReview('tenant-a', 'user-a', 'catalog-a', {
      action: 'validate',
    })).resolves.toEqual({ updated: 1, fromStatus: 'saved', toStatus: 'validated' });
    await expect(service.bulkReview('tenant-a', 'user-a', 'catalog-a', {
      action: 'validate',
    })).resolves.toEqual({ updated: 0, fromStatus: 'saved', toStatus: 'validated' });
    expect(product.update).toHaveBeenCalledTimes(1);
  });

  test('isole le catalogue et le tenant lors du verrouillage global', async () => {
    mockKnowledgeFindAll.mockResolvedValue([]);
    await service.bulkReview('tenant-a', 'user-a', 'catalog-a', { action: 'save' });
    expect(mockCollectionFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'catalog-a', tenantId: 'tenant-a', status: 'draft' },
    }));
    expect(mockKnowledgeFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-a', collectionId: 'catalog-a', itemType: 'product' },
      transaction: expect.any(Object),
    }));
  });
});

describe('catalogProductService structural changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionFindOne.mockResolvedValue({ status: 'draft' });
  });

  test('une fusion remet la cible dans la file à valider', async () => {
    const target = {
      id: 'target', collectionId: 'catalog-a', metadata: { reviewStatus: 'saved' },
      update: jest.fn().mockResolvedValue(), reload: jest.fn().mockResolvedValue({ id: 'target' }),
    };
    const source = { id: 'source', collectionId: 'catalog-a', metadata: { reviewStatus: 'new' } };
    mockKnowledgeFindAll.mockResolvedValue([target, source]);
    await service.mergeProducts('tenant-a', 'user-a', 'target', ['source']);
    expect(target.update).toHaveBeenCalledWith({
      metadata: expect.objectContaining({ reviewStatus: 'saved', reviewRequired: true }),
    }, expect.objectContaining({ transaction: expect.any(Object) }));
  });

  test('une séparation remet les deux fiches dans la file à valider', async () => {
    const product = {
      id: 'p1', collectionId: 'catalog-a', title: 'PC', isActive: false,
      metadata: { reviewStatus: 'saved' },
      get: () => ({ collectionId: 'catalog-a', title: 'PC', metadata: { reviewStatus: 'saved' } }),
      update: jest.fn().mockResolvedValue(),
    };
    mockKnowledgeFindOne.mockResolvedValue(product);
    mockAssetFindAll.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    mockKnowledgeCreate.mockResolvedValue({ id: 'copy' });
    await service.splitProduct('tenant-a', 'user-a', 'p1', ['a2']);
    expect(product.update).toHaveBeenCalledWith({
      metadata: expect.objectContaining({ reviewStatus: 'saved', reviewRequired: true }),
    }, expect.objectContaining({ transaction: expect.any(Object) }));
    expect(mockKnowledgeCreate).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ reviewStatus: 'saved', splitFrom: 'p1' }),
    }), expect.any(Object));
  });
});
