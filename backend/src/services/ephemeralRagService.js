const chunkingService = require('./ragChunkingService');
const ragService = require('./ragService');
const config = require('../config/config');

function tokenize(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]{2,}/g) || []
  );
}

function lexicalScore(query, content) {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) return 0;
  const contentTokens = tokenize(content);
  let matches = 0;
  queryTokens.forEach((token) => {
    if (contentTokens.has(token)) matches += 1;
  });
  return matches / queryTokens.size;
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

// Retourne null dès que le scoring sémantique n'aboutit pas : l'appelant retombe
// alors sur le scoring lexical. Une panne d'embeddings (clé invalide, quota, réseau)
// ne doit jamais interrompre le traitement du média.
async function semanticScores(query, chunks) {
  if (!ragService.isEmbeddingAvailable()) return null;
  try {
    const queryEmbedding = await ragService.generateEmbedding(query);
    if (!queryEmbedding) return null;
    const embeddings = await Promise.all(
      chunks.map((chunk) => ragService.generateEmbedding(chunk.content))
    );
    if (embeddings.some((embedding) => !embedding)) return null;
    return embeddings.map((embedding) => cosineSimilarity(queryEmbedding, embedding));
  } catch (error) {
    console.warn('Embeddings média indisponibles, repli sur le scoring lexical:', error.message);
    return null;
  }
}

function joinWithinLimit(chunks) {
  const selected = [];
  let length = 0;
  for (const chunk of chunks.slice(0, config.media.maxContextChunks)) {
    const remaining = config.media.maxContextChars - length;
    if (remaining <= 0) break;
    const content = chunk.content.slice(0, remaining);
    selected.push(content);
    length += content.length;
  }
  return selected.join('\n\n');
}

async function selectContext({ content, title, query }) {
  const chunks = chunkingService.createChunks({
    content,
    title,
    metadata: { source: 'inbound-media' },
  }).slice(0, 20);
  if (chunks.length === 0) return '';

  const semantic = await semanticScores(query, chunks);
  const ranked = chunks
    .map((chunk, index) => ({
      ...chunk,
      score: semantic ? semantic[index] : lexicalScore(query, chunk.content),
    }))
    .sort((left, right) => right.score - left.score);
  return joinWithinLimit(ranked);
}

module.exports = {
  cosineSimilarity,
  lexicalScore,
  selectContext,
};
