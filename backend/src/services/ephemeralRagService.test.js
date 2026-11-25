jest.mock('./ragService', () => ({
  isEmbeddingAvailable: jest.fn(() => false),
  generateEmbedding: jest.fn(),
}));
jest.mock('../config/config', () => ({
  media: {
    maxContextChars: 12000,
    maxContextChunks: 4,
  },
}));

const ragService = require('./ragService');
const ephemeralRagService = require('./ephemeralRagService');

describe('ephemeralRagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ragService.isEmbeddingAvailable.mockReturnValue(false);
  });

  it('selects relevant chunks with lexical fallback and keeps context bounded', async () => {
    const content = [
      'La facture numéro 42 doit être payée avant le 30 juillet. '.repeat(20),
      'Le guide de jardinage explique comment arroser les plantes. '.repeat(20),
    ].join('\n\n');
    const context = await ephemeralRagService.selectContext({
      content,
      title: 'Facture',
      query: 'Quand payer la facture 42 ?',
    });
    expect(context).toContain('facture numéro 42');
    expect(context.length).toBeLessThanOrEqual(12000);
  });

  it('falls back to lexical scoring when embeddings fail', async () => {
    ragService.isEmbeddingAvailable.mockReturnValue(true);
    ragService.generateEmbedding.mockRejectedValue(
      Object.assign(new Error('401 Incorrect API key provided'), { code: 'invalid_api_key' })
    );

    const context = await ephemeralRagService.selectContext({
      content: 'La facture numéro 42 doit être payée avant le 30 juillet. '.repeat(20),
      title: 'Facture',
      query: 'Quand payer la facture 42 ?',
    });

    expect(context).toContain('facture numéro 42');
  });

  it('calculates cosine similarity safely', () => {
    expect(ephemeralRagService.cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(ephemeralRagService.cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });
});
