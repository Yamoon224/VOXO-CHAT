const OpenAI = require('openai');
const { Op, QueryTypes } = require('sequelize');
const config = require('../config/config');
const { sequelize, KnowledgeBase, KnowledgeChunk } = require('../models');
const chunkingService = require('./ragChunkingService');
const textUtils = require('../utils/textUtils');

class RagService {
  constructor() {
    this.embeddingModel = config.openai.embeddingModel || 'text-embedding-3-small';
    this.minSimilarity = config.rag?.minSimilarity ?? 0.35;
    this.defaultTopK = config.rag?.topK ?? 5;
    const apiKey = process.env.OPENAI_DIRECT_KEY;
    this.embeddingClient = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isEmbeddingAvailable() {
    return Boolean(this.embeddingClient);
  }

  async generateEmbedding(text) {
    if (!this.embeddingClient) return null;

    const response = await this.embeddingClient.embeddings.create({
      model: this.embeddingModel,
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }

  serializeVector(vector) {
    return `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
  }

  formatChunkResult(row, fallbackSimilarity = 0.5) {
    const item = {
      id: row.knowledgeId || row.knowledge_id || row.id,
      knowledgeId: row.knowledgeId || row.knowledge_id || row.id,
      chunkId: row.chunkId || row.chunk_id || null,
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      sourceType: row.sourceType || row.source_type,
      metadata: row.metadata || {},
    };

    return {
      item,
      knowledgeId: item.knowledgeId,
      chunkId: item.chunkId,
      title: item.title,
      content: item.content,
      tags: item.tags,
      sourceType: item.sourceType,
      metadata: item.metadata,
      similarity: Number(row.similarity ?? fallbackSimilarity),
    };
  }

  deduplicateByKnowledge(results, limit) {
    const seen = new Set();
    const deduped = [];

    for (const result of results) {
      if (seen.has(result.knowledgeId)) continue;
      seen.add(result.knowledgeId);
      deduped.push(result);
      if (deduped.length >= limit) break;
    }

    return deduped;
  }

  // Délègue à l'implémentation partagée avec la détection d'intention (utils/textUtils).
  normalizeText(value) {
    return textUtils.normalizeText(value);
  }

  extractMeaningfulTerms(query) {
    const stopWords = new Set([
      'alors', 'avec', 'avoir', 'cette', 'comme', 'comment', 'dans', 'des', 'donc',
      'elle', 'elles', 'est', 'etes', 'faire', 'ils', 'les', 'leur', 'leurs', 'mais',
      'mes', 'mon', 'nous', 'notre', 'pour', 'pouvez', 'que', 'quel', 'quelle',
      'quelles', 'quels', 'qui', 'quoi', 'sans', 'sont', 'sur', 'une', 'vos', 'votre',
    ]);

    return [...new Set(
      this.normalizeText(query)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 2 && !stopWords.has(term))
    )].slice(0, 8);
  }

  scoreTextResult(item, terms) {
    const title = this.normalizeText(item.title);
    const content = this.normalizeText(item.content);
    const tags = this.normalizeText((item.tags || []).join(' '));
    const countMatches = (text) => terms.filter((term) => text.includes(term)).length;
    const titleCoverage = countMatches(title) / terms.length;
    const contentCoverage = countMatches(content) / terms.length;
    const tagCoverage = countMatches(tags) / terms.length;
    const coverage = terms.filter((term) => (
      title.includes(term) || content.includes(term) || tags.includes(term)
    )).length / terms.length;

    return Math.min(0.85, 0.35
      + (coverage * 0.25)
      + (titleCoverage * 0.15)
      + (tagCoverage * 0.10)
      + (contentCoverage * 0.05));
  }

  async rebuildKnowledgeItem(knowledgeItem, options = {}) {
    const item = knowledgeItem.toJSON ? knowledgeItem.toJSON() : knowledgeItem;
    const force = options.force !== false;

    if (force) {
      await KnowledgeChunk.destroy({
        where: { knowledgeBaseId: item.id },
      });
    }

    const existingCount = await KnowledgeChunk.count({
      where: { knowledgeBaseId: item.id },
    });

    if (existingCount > 0 && !force) {
      const pendingChunks = await KnowledgeChunk.findAll({
        where: {
          knowledgeBaseId: item.id,
          embeddingStatus: { [Op.ne]: 'done' },
        },
        order: [['chunkIndex', 'ASC']],
      });
      const embedded = await this.embedChunks(pendingChunks);
      return { created: 0, embedded, skipped: existingCount - pendingChunks.length };
    }

    const chunks = chunkingService.createChunks({
      title: item.title,
      content: item.content,
      metadata: {
        ...(item.metadata || {}),
        knowledgeBaseId: item.id,
        sourceType: item.sourceType,
        tags: item.tags || [],
        itemType: item.itemType || 'knowledge',
        category: item.category || null,
        sku: item.sku || null,
        priceAmount: item.priceAmount || null,
        priceCurrency: item.priceCurrency || null,
        stockStatus: item.stockStatus || null,
      },
    });

    const createdChunks = await KnowledgeChunk.bulkCreate(chunks.map((chunk) => ({
      tenantId: item.tenantId,
      knowledgeBaseId: item.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      contentHash: chunk.contentHash,
      embeddingModel: this.embeddingModel,
      embeddingStatus: 'pending',
      metadata: chunk.metadata,
    })));

    const embedded = await this.embedChunks(createdChunks);
    return { created: createdChunks.length, embedded, skipped: 0 };
  }

  async embedChunks(chunks) {
    if (!this.embeddingClient || chunks.length === 0) {
      return 0;
    }

    let embedded = 0;

    for (const chunk of chunks) {
      try {
        await chunk.update({
          embeddingStatus: 'indexing',
          embeddingError: null,
          embeddingModel: this.embeddingModel,
        });

        const embedding = await this.generateEmbedding(chunk.content);
        if (!embedding) {
          await chunk.update({ embeddingStatus: 'pending' });
          continue;
        }

        await sequelize.query(`
          UPDATE knowledge_chunks
          SET embedding = CAST(:embedding AS vector),
              embedding_model = :embeddingModel,
              embedding_status = 'done',
              embedding_error = NULL,
              updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: {
            id: chunk.id,
            embedding: this.serializeVector(embedding),
            embeddingModel: this.embeddingModel,
          },
        });

        embedded += 1;
      } catch (error) {
        await chunk.update({
          embeddingStatus: 'error',
          embeddingError: error.message,
        });
      }
    }

    return embedded;
  }

  async indexTenantKnowledge(tenantId, options = {}) {
    const { force = false, batchSize = 20 } = options;
    const where = { tenantId, isActive: true };
    const items = await KnowledgeBase.findAll({
      where,
      limit: options.limit || undefined,
      order: [['updatedAt', 'DESC']],
    });

    const summary = { documents: items.length, chunksCreated: 0, chunksEmbedded: 0, skipped: 0 };

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (const item of batch) {
        const result = await this.rebuildKnowledgeItem(item, { force });
        summary.chunksCreated += result.created;
        summary.chunksEmbedded += result.embedded;
        summary.skipped += result.skipped;
      }
    }

    return summary;
  }

  async searchVector(tenantId, query, limit) {
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) return [];

    const rows = await sequelize.query(`
      SELECT
        kc.id AS "chunkId",
        kc.content AS content,
        kc.metadata AS metadata,
        kb.id AS "knowledgeId",
        kb.title AS title,
        kb.tags AS tags,
        kb.source_type AS "sourceType",
        1 - (kc.embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM knowledge_chunks kc
      INNER JOIN "KnowledgeBase" kb ON kb.id = kc.knowledge_base_id
      WHERE kc.tenant_id = :tenantId
        AND kb.is_active = true
        AND kc.embedding_status = 'done'
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> CAST(:embedding AS vector)
      LIMIT :rawLimit
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        tenantId,
        embedding: this.serializeVector(queryEmbedding),
        rawLimit: Math.max(limit * 3, limit),
      },
    });

    return this.deduplicateByKnowledge(rows.map((row) => this.formatChunkResult(row)), limit);
  }

  async searchText(tenantId, query, limit) {
    const terms = this.extractMeaningfulTerms(query);
    if (terms.length === 0) return [];

    const textConditions = terms.flatMap((term) => [
      { title: { [Op.iLike]: `%${term}%` } },
      { content: { [Op.iLike]: `%${term}%` } },
    ]);
    textConditions.push({ tags: { [Op.overlap]: terms } });

    const results = await KnowledgeBase.findAll({
      where: {
        tenantId,
        isActive: true,
        [Op.or]: textConditions,
      },
      limit: Math.max(limit * 4, limit),
      order: [['updatedAt', 'DESC']],
    });

    return results
      .map((item) => this.formatChunkResult({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: item.tags,
        sourceType: item.sourceType,
        metadata: item.metadata,
        similarity: this.scoreTextResult(item, terms),
      }))
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, limit);
  }

  async search(tenantId, query, limit = this.defaultTopK) {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) return [];

    const resultLimit = Math.max(1, Number(limit) || this.defaultTopK);

    if (this.embeddingClient) {
      try {
        const vectorResults = await this.searchVector(tenantId, normalizedQuery, resultLimit);
        const relevantVectorResults = vectorResults.filter(
          (result) => result.similarity >= this.minSimilarity
        );
        if (relevantVectorResults.length > 0) {
          return relevantVectorResults;
        }
      } catch (error) {
        console.warn('RAG vector search failed, falling back to text search:', error.message);
      }
    }

    return this.searchText(tenantId, normalizedQuery, resultLimit);
  }

  async getIndexStatus(tenantId) {
    const [activeDocuments, indexedDocuments, groupedChunks] = await Promise.all([
      KnowledgeBase.count({ where: { tenantId, isActive: true } }),
      KnowledgeChunk.count({
        where: { tenantId, embeddingStatus: 'done' },
        distinct: true,
        col: 'knowledge_base_id',
      }),
      KnowledgeChunk.findAll({
        where: { tenantId },
        attributes: [
          'embeddingStatus',
          [sequelize.fn('COUNT', '*'), 'count'],
        ],
        group: ['embeddingStatus'],
        raw: true,
      }),
    ]);

    const chunks = { total: 0, done: 0, pending: 0, indexing: 0, error: 0 };
    groupedChunks.forEach((row) => {
      const status = row.embeddingStatus;
      const count = parseInt(row.count, 10) || 0;
      chunks.total += count;
      if (Object.hasOwn(chunks, status)) chunks[status] = count;
    });

    return {
      embeddingProviderAvailable: this.isEmbeddingAvailable(),
      minSimilarity: this.minSimilarity,
      topK: this.defaultTopK,
      activeDocuments,
      indexedDocuments,
      embeddingCoverage: activeDocuments > 0
        ? Math.round((indexedDocuments / activeDocuments) * 100)
        : 0,
      chunks,
    };
  }
}

const ragService = new RagService();

module.exports = ragService;
module.exports.RagService = RagService;
