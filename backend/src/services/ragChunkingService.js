const crypto = require('crypto');

class RagChunkingService {
  constructor() {
    this.targetSize = 3200;
    this.overlapSize = 500;
    this.minSize = 200;
  }

  normalizeContent(content) {
    return String(content || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  findBoundary(text, start, maxEnd) {
    if (maxEnd >= text.length) return text.length;

    const minEnd = Math.min(text.length, start + Math.floor(this.targetSize * 0.65));
    const window = text.slice(minEnd, maxEnd);
    const boundaryPatterns = ['\n\n', '. ', '! ', '? ', '\n'];

    for (const pattern of boundaryPatterns) {
      const offset = window.lastIndexOf(pattern);
      if (offset !== -1) {
        return minEnd + offset + pattern.length;
      }
    }

    const lastSpace = text.lastIndexOf(' ', maxEnd);
    return lastSpace > minEnd ? lastSpace : maxEnd;
  }

  getPageNumber(content, absoluteStart) {
    const beforeChunk = content.slice(0, absoluteStart);
    const matches = beforeChunk.match(/--- Page (\d+) ---/g);
    if (!matches || matches.length === 0) return null;

    const last = matches[matches.length - 1].match(/\d+/);
    return last ? Number(last[0]) : null;
  }

  createChunks({ content, title, metadata = {} }) {
    const normalized = this.normalizeContent(content);
    if (!normalized) return [];

    const chunks = [];
    let start = 0;

    while (start < normalized.length) {
      const maxEnd = Math.min(normalized.length, start + this.targetSize);
      const end = this.findBoundary(normalized, start, maxEnd);
      const chunkContent = normalized.slice(start, end).trim();

      if (chunkContent.replace(/\s/g, '').length >= this.minSize || normalized.length < this.minSize) {
        const pageNumber = this.getPageNumber(normalized, start);
        chunks.push({
          content: chunkContent,
          chunkIndex: chunks.length,
          contentHash: this.hashContent(chunkContent),
          metadata: {
            ...metadata,
            title,
            chunkStart: start,
            chunkEnd: end,
            ...(pageNumber ? { pageNumber } : {}),
          },
        });
      }

      if (end >= normalized.length) break;

      const nextStart = Math.max(0, end - this.overlapSize);
      start = nextStart > start ? nextStart : end;
    }

    return chunks;
  }
}

module.exports = new RagChunkingService();
module.exports.RagChunkingService = RagChunkingService;
