jest.mock('./extraction/imageExtractor', () => ({ extract: jest.fn() }));
jest.mock('./catalogVisionExtractionService', () => ({ extract: jest.fn() }));

const service = require('./catalogSourceAnalysisService');

describe('catalogSourceAnalysisService', () => {
  test('fusionne deux observations du mÃªme produit sans confondre les prix', () => {
    const products = service.deduplicate([
      {
        title: 'PC Portable Gaming MSI Pulse 16 A1 C1VGKG-010FR',
        priceAmount: 1995900, priceCurrency: 'XOF', sourcePages: [3],
        specifications: [], reviewRequired: false, assetBuffer: Buffer.from('page'),
      },
      {
        title: 'PC Portable Gaming MSI Pulse 16 AI C1VGKG-010FR 16 QHD 240 Hz RTX 4070',
        priceAmount: 1995900, priceCurrency: 'XOF', sourcePages: [2, 3],
        specifications: [{ name: 'GPU', value: 'RTX 4070' }],
        reviewRequired: false, assetBuffer: Buffer.from('boundary'),
      },
      {
        title: 'Autre portable', priceAmount: 1995901, priceCurrency: 'XOF',
        sourcePages: [3], specifications: [], reviewRequired: false,
      },
    ]);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      title: expect.stringContaining('RTX 4070'),
      sourcePages: [2, 3],
      specifications: [{ name: 'GPU', value: 'RTX 4070' }],
    });
  });
});
