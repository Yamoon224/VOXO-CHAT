const service = require('./catalogValidationService');

describe('catalogValidationService', () => {
  test('garde les chaînes SQL comme simples données et valide les nombres séparément', () => {
    expect(service.validateProductUpdate({ title: "PC'; DROP TABLE users; --", priceAmount: '250000' }))
      .toMatchObject({ title: "PC'; DROP TABLE users; --", priceAmount: 250000 });
  });

  test.each([
    [{ stockStatus: 'available' }, 'INVALID_STOCK_STATUS'],
    [{ priceCurrency: '<script>' }, 'INVALID_CURRENCY'],
    [{ priceAmount: '1; DROP TABLE' }, 'INVALID_PRICE'],
    [{ action: 'publish' }, 'INVALID_REVIEW_ACTION'],
  ])('refuse une donnée structurée invalide', (payload, code) => {
    expect(() => service.validateProductUpdate(payload)).toThrow(expect.objectContaining({ code }));
  });
});
