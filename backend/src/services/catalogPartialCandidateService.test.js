const service = require('./catalogPartialCandidateService');

describe('catalogPartialCandidateService', () => {
  test('conserve une fiche sans image avec ses informations disponibles', () => {
    const [product] = service.prepareCandidates([{
      title: 'PC portable', priceAmount: 250000, priceCurrency: 'XOF',
      specifications: [{ name: 'RAM', value: '16 Go' }], pageNumber: 2,
    }]);
    expect(product).toMatchObject({
      title: 'PC portable', reviewRequired: true, provisionalTitle: false,
      missingFields: expect.arrayContaining(['sku', 'description', 'image']),
    });
  });

  test("génère un titre provisoire lorsqu'une autre donnée utile existe", () => {
    const [product] = service.prepareCandidates([{
      title: null, priceAmount: 84900, priceCurrency: 'XOF', pageNumber: 3,
    }]);
    expect(product.title).toBe('Produit à vérifier — page 3 — n°1');
    expect(product).toMatchObject({ provisionalTitle: true, reviewRequired: true });
  });

  test('rejette les fragments sans donnée produit structurée', () => {
    expect(service.prepareCandidates([{ title: null, description: '', specifications: [] }]))
      .toEqual([]);
  });
});
