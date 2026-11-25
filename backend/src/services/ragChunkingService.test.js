const { RagChunkingService } = require('./ragChunkingService');

describe('RagChunkingService', () => {
  test('splits long content into overlapping chunks with metadata and hashes', () => {
    const service = new RagChunkingService();
    service.targetSize = 120;
    service.overlapSize = 30;
    service.minSize = 10;

    const content = Array.from({ length: 80 }, (_, index) => `mot${index}`).join(' ');
    const chunks = service.createChunks({
      title: 'Document test',
      content,
      metadata: { originalFileName: 'test.pdf' },
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[0].contentHash).toHaveLength(64);
    expect(chunks[0].metadata.title).toBe('Document test');
    expect(chunks[0].metadata.originalFileName).toBe('test.pdf');

    const firstTail = chunks[0].content.slice(-20).trim();
    expect(chunks[1].content).toContain(firstTail.split(' ')[0]);
  });

  test('extracts page metadata when PDF page markers are present', () => {
    const service = new RagChunkingService();
    service.targetSize = 80;
    service.overlapSize = 10;
    service.minSize = 10;

    const chunks = service.createChunks({
      title: 'PDF test',
      content: `--- Page 1 ---\n${'alpha '.repeat(30)}\n--- Page 2 ---\n${'beta '.repeat(30)}`,
      metadata: {},
    });

    expect(chunks.some(chunk => chunk.metadata.pageNumber === 2)).toBe(true);
  });
});
