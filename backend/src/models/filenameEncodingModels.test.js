const KnowledgeAsset = require('./KnowledgeAsset');
const MessageAttachment = require('./MessageAttachment');

describe.each([
  ['KnowledgeAsset', KnowledgeAsset, { assetType: 'source' }],
  ['MessageAttachment', MessageAttachment, { category: 'image' }],
])('%s filename encoding', (_name, Model, extra) => {
  test('normalise à l’écriture et dans la réponse publique', () => {
    const record = Model.build({
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: '00000000-0000-4000-8000-000000000002',
      originalName: "Capture d'Ã©cran.png",
      mimeType: 'image/png', sizeBytes: 42, storageKey: 'private/key', ...extra,
    });

    expect(record.getDataValue('originalName')).toBe("Capture d'écran.png");
    expect(record.toPublicJSON()).toMatchObject({ name: "Capture d'écran.png" });
  });

  test('répare aussi une ancienne valeur brute à la lecture', () => {
    const record = Model.build({ originalName: 'initial.pdf', ...extra });
    record.setDataValue('originalName', 'AperÃƒÂ§u.pdf');
    expect(record.originalName).toBe('Aperçu.pdf');
  });
});
