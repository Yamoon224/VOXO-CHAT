jest.mock('./openaiService', () => ({ client: null }));
jest.mock('./catalogVisionImageService', () => ({
  toDataUrl: jest.fn().mockResolvedValue('data:image/jpeg;base64,fixture'),
}));

const service = require('./catalogVisionExtractionService');

function completion(product) {
  return { choices: [{ message: { content: JSON.stringify({ products: [product] }) } }] };
}

const base = {
  title: 'MSI Pulse 16 AI C1VGKG-010FR', sku: 'C1VGKG-010FR',
  priceAmount: 1995900, priceCurrency: 'FCFA', priceMode: 'fixed',
  comparisonPriceAmount: 2229999, description: 'PC portable gaming',
  specifications: [{ name: 'Mémoire', value: '16 Go DDR5' }],
  sourceRegion: { x: 0, y: 0, width: 1, height: 1 },
  evidence: { title: 'MSI Pulse', sku: 'C1VGKG-010FR', price: '1 995 900 FCFA' },
};

describe('catalogVisionExtractionService', () => {
  test('utilise le modèle de secours seulement pour une extraction faible', async () => {
    const create = jest.fn()
      .mockResolvedValueOnce(completion({
        ...base, confidence: { title: 0.5, sku: 0.8, price: 0.5, description: 0.8, specifications: 0.8 },
      }))
      .mockResolvedValueOnce(completion({
        ...base, confidence: { title: 0.98, sku: 0.95, price: 0.99, description: 0.9, specifications: 0.9 },
      }));
    const result = await service.extract(Buffer.from('image'), 'OCR', {
      client: { chat: { completions: { create } } }, mode: 'image',
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ usedFallback: true });
    expect(result.products[0]).toMatchObject({
      sku: 'C1VGKG-010FR', priceAmount: 1995900, priceCurrency: 'XOF', reviewRequired: false,
    });
  });

  test('le repli OCR laisse la référence vide sans client IA', async () => {
    const result = await service.extract(Buffer.from('image'), 'Imprimante Canon Pixma TS5340\nPrix : 84 900 FCFA', {
      client: null, mode: 'image',
    });
    expect(result.products[0]).toMatchObject({ sku: null, priceAmount: 84900, priceCurrency: 'XOF' });
  });
});
