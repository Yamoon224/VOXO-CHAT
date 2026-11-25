jest.mock('../models', () => ({ KnowledgeBase: {}, KnowledgeAsset: {} }));
jest.mock('./ragService', () => ({}));
jest.mock('./storageService', () => ({}));
jest.mock('./visionService', () => ({}));

const service = require('./productImageSearchService');

describe('productImageSearchService responses', () => {
  test('annonce le prix et demande la quantité pour un produit en stock', () => {
    const result = service.exactResponse({
      id: 'p1', title: 'PC Pro', stockStatus: 'in_stock',
      priceAmount: 350000, priceCurrency: 'XOF', priceMode: 'fixed',
    });
    expect(result.response).toContain('350 000 XOF');
    expect(result.response).toContain('Quelle quantité');
    expect(result.action).toMatchObject({ stage: 'quantity', productId: 'p1' });
  });

  test('ne prétend pas avoir du stock quand il est épuisé', () => {
    const result = service.exactResponse({ id: 'p2', title: 'PC', stockStatus: 'out_of_stock' });
    expect(result.response).toContain('stock est actuellement épuisé');
    expect(result.action.reason).toBe('restock');
  });

  test('n’invente pas un prix absent', () => {
    expect(service.exactResponse({ id: 'p3', title: 'PC', stockStatus: 'unknown' }).response)
      .not.toMatch(/prix est de/);
  });
});
