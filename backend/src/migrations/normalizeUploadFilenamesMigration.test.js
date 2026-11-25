const migration = require('../../migrations/20260811000300-normalize-upload-filenames');

function queryInterface(rowsByCall) {
  return {
    bulkUpdate: jest.fn(async () => undefined),
    sequelize: {
      query: jest.fn(async () => [rowsByCall.shift() || []]),
      transaction: jest.fn(async callback => callback({ id: 'transaction' })),
    },
  };
}

describe('normalize upload filenames migration', () => {
  test('répare uniquement les noms corrompus des deux tables', async () => {
    const qi = queryInterface([
      [
        { id: 'asset-1', original_name: "Capture d'Ã©cran.png" },
        { id: 'asset-2', original_name: 'ordinateurs.pdf' },
      ],
      [{ id: 'attachment-1', original_name: 'AperÃƒÂ§u.pdf' }],
    ]);

    await migration.up(qi);

    expect(qi.bulkUpdate).toHaveBeenCalledTimes(2);
    expect(qi.bulkUpdate).toHaveBeenNthCalledWith(
      1, 'knowledge_assets', { original_name: "Capture d'écran.png" },
      { id: 'asset-1' }, { transaction: { id: 'transaction' } }
    );
    expect(qi.bulkUpdate).toHaveBeenNthCalledWith(
      2, 'message_attachments', { original_name: 'Aperçu.pdf' },
      { id: 'attachment-1' }, { transaction: { id: 'transaction' } }
    );
  });

  test('est idempotente lorsque les noms sont déjà sains', async () => {
    const qi = queryInterface([
      [{ id: 'asset-1', original_name: "Capture d'écran.png" }],
      [{ id: 'attachment-1', original_name: 'Aperçu.pdf' }],
    ]);
    await migration.up(qi);
    expect(qi.bulkUpdate).not.toHaveBeenCalled();
  });

  test('le retour arrière ne réintroduit aucune corruption', async () => {
    await expect(migration.down()).resolves.toBeUndefined();
  });
});
