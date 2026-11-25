const { safeMetadata } = require('./knowledgeSerializer');

describe('safeMetadata', () => {
  test('ne révèle aucune clé, donnée binaire ou chemin temporaire', () => {
    const result = safeMetadata({
      storage: { key: 'tenant/knowledge/secret.pdf', size: 12, mimeType: 'application/pdf' },
      storageKey: 'secret', base64: 'AAAA', buffer: 'binary', tempPath: '/tmp/a',
    });
    expect(result.storage).toEqual({
      available: true, size: 12, mimeType: 'application/pdf', originalName: undefined,
    });
    expect(JSON.stringify(result)).not.toMatch(/secret|AAAA|\/tmp/);
  });
});
