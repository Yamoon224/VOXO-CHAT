jest.mock('../models', () => ({
  sequelize: { query: jest.fn(), fn: jest.fn((name, value) => ({ name, value })) },
  KnowledgeBase: { findAll: jest.fn(), count: jest.fn() },
  KnowledgeChunk: {
    destroy: jest.fn(),
    count: jest.fn(),
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
}));

const { sequelize, KnowledgeBase, KnowledgeChunk } = require('../models');
const { Op } = require('sequelize');
const { RagService } = require('./ragService');

describe('RagService', () => {
  beforeEach(() => {
    delete process.env.OPENAI_DIRECT_KEY;
    jest.clearAllMocks();
  });

  test('falls back to text search when embeddings are unavailable', async () => {
    KnowledgeBase.findAll.mockResolvedValue([
      {
        id: 'knowledge-1',
        title: 'Tarifs VOXO',
        content: 'Le plan pro coute 29 euros par mois.',
        tags: ['tarifs'],
        sourceType: 'manual',
        metadata: { section: 'pricing' },
      },
    ]);

    const service = new RagService();
    const results = await service.search('tenant-1', 'plan pro', 5);

    expect(KnowledgeBase.findAll).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      knowledgeId: 'knowledge-1',
      chunkId: null,
      title: 'Tarifs VOXO',
      sourceType: 'manual',
    });
    expect(results[0].similarity).toBeGreaterThanOrEqual(service.minSimilarity);
  });

  test('finds a reformulated question by meaningful terms and preserves tenant isolation', async () => {
    KnowledgeBase.findAll.mockResolvedValue([
      {
        id: 'knowledge-1',
        title: 'Offres et abonnements',
        content: 'Le plan professionnel coute 29 euros par mois.',
        tags: ['tarifs'],
        sourceType: 'manual',
        metadata: {},
      },
    ]);

    const service = new RagService();
    const results = await service.search('tenant-a', 'Quels sont vos tarifs professionnels ?', 5);
    const query = KnowledgeBase.findAll.mock.calls[0][0];

    expect(query.where.tenantId).toBe('tenant-a');
    expect(query.where.isActive).toBe(true);
    expect(query.where[Op.or]).toContainEqual({
      tags: { [Op.overlap]: ['tarifs', 'professionnels'] },
    });
    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBeGreaterThanOrEqual(service.minSimilarity);
  });

  test('returns no lexical result for an empty knowledge base', async () => {
    KnowledgeBase.findAll.mockResolvedValue([]);

    const service = new RagService();
    await expect(service.search('tenant-1', 'Quels sont vos tarifs ?', 5)).resolves.toEqual([]);
  });

  test('falls back to lexical search when vector candidates are below the threshold', async () => {
    const service = new RagService();
    service.embeddingClient = {};
    jest.spyOn(service, 'searchVector').mockResolvedValue([
      { knowledgeId: 'weak-vector', similarity: service.minSimilarity - 0.01 },
    ]);
    jest.spyOn(service, 'searchText').mockResolvedValue([
      { knowledgeId: 'lexical', similarity: 0.7 },
    ]);

    const results = await service.search('tenant-1', 'tarifs', 5);

    expect(service.searchText).toHaveBeenCalledWith('tenant-1', 'tarifs', 5);
    expect(results).toEqual([{ knowledgeId: 'lexical', similarity: 0.7 }]);
  });

  test('keeps relevant vector results without running lexical fallback', async () => {
    const service = new RagService();
    service.embeddingClient = {};
    jest.spyOn(service, 'searchVector').mockResolvedValue([
      { knowledgeId: 'vector', similarity: service.minSimilarity },
    ]);
    jest.spyOn(service, 'searchText');

    const results = await service.search('tenant-1', 'tarifs', 5);

    expect(service.searchText).not.toHaveBeenCalled();
    expect(results).toEqual([{ knowledgeId: 'vector', similarity: service.minSimilarity }]);
  });

  test('reports empty chunks and embedding errors in index status', async () => {
    KnowledgeBase.count.mockResolvedValue(2);
    KnowledgeChunk.count.mockResolvedValue(1);
    KnowledgeChunk.findAll.mockResolvedValue([
      { embeddingStatus: 'done', count: '2' },
      { embeddingStatus: 'error', count: '1' },
    ]);

    const service = new RagService();
    const status = await service.getIndexStatus('tenant-1');

    expect(status).toMatchObject({
      embeddingProviderAvailable: false,
      activeDocuments: 2,
      indexedDocuments: 1,
      embeddingCoverage: 50,
      chunks: { total: 3, done: 2, pending: 0, indexing: 0, error: 1 },
    });
  });

  test('marks a chunk as errored when embedding generation fails', async () => {
    const service = new RagService();
    service.embeddingClient = {};
    jest.spyOn(service, 'generateEmbedding').mockRejectedValue(new Error('embedding unavailable'));
    const chunk = { update: jest.fn().mockResolvedValue(undefined) };

    const embedded = await service.embedChunks([chunk]);

    expect(embedded).toBe(0);
    expect(sequelize.query).not.toHaveBeenCalled();
    expect(chunk.update).toHaveBeenLastCalledWith({
      embeddingStatus: 'error',
      embeddingError: 'embedding unavailable',
    });
  });

  test('deduplicates vector results by parent knowledge document', () => {
    const service = new RagService();
    const results = service.deduplicateByKnowledge([
      { knowledgeId: 'doc-1', similarity: 0.9 },
      { knowledgeId: 'doc-1', similarity: 0.8 },
      { knowledgeId: 'doc-2', similarity: 0.7 },
    ], 5);

    expect(results).toEqual([
      { knowledgeId: 'doc-1', similarity: 0.9 },
      { knowledgeId: 'doc-2', similarity: 0.7 },
    ]);
  });
});

describe('RagService — contenu non fiable venant des canaux', () => {
  const SQLI = '\'; DROP TABLE "KnowledgeBase"; --';

  beforeEach(() => {
    delete process.env.OPENAI_DIRECT_KEY;
    jest.clearAllMocks();
  });

  test('une transcription malveillante reste une valeur liée, jamais du SQL', async () => {
    KnowledgeBase.findAll.mockResolvedValue([]);
    const service = new RagService();

    await service.searchText('tenant-1', SQLI, 5);

    // Sequelize reçoit la charge comme opérande d'un opérateur, pas comme fragment de requête.
    const where = KnowledgeBase.findAll.mock.calls[0][0].where;
    expect(where.tenantId).toBe('tenant-1');

    const boundValues = where[Op.or].flatMap((condition) => Object.values(condition)
      .flatMap((operand) => Object.getOwnPropertySymbols(operand).map((sym) => operand[sym])));
    // La charge est découpée en termes liés ; aucun fragment SQL ne survit tel quel.
    expect(boundValues.some((value) => String(value).includes('drop'))).toBe(true);
    boundValues.forEach((value) => {
      expect(String(value)).not.toContain('--');
      expect(String(value)).not.toContain(';');
    });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('la recherche vectorielle passe la requête en replacement paramétré', async () => {
    process.env.OPENAI_DIRECT_KEY = 'sk-proj-test';
    const service = new RagService();
    service.generateEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    sequelize.query.mockResolvedValue([]);

    await service.searchVector('tenant-1', SQLI, 5);

    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain(':tenantId');
    expect(options.replacements.tenantId).toBe('tenant-1');
  });
});
