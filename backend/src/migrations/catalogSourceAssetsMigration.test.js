const migration = require('../../migrations/20260811000200-enable-catalog-source-assets');

function queryInterface() {
  return {
    addColumn: jest.fn(), changeColumn: jest.fn(), addIndex: jest.fn(),
    removeIndex: jest.fn(), removeColumn: jest.fn(),
    sequelize: { query: jest.fn() },
  };
}

describe('catalog source assets migration', () => {
  test('autorise exactement un propriÃ©taire produit ou catalogue', async () => {
    const qi = queryInterface();
    await migration.up(qi, { UUID: 'UUID' });
    expect(qi.addColumn).toHaveBeenCalledWith('knowledge_assets', 'collection_id', expect.objectContaining({
      allowNull: true, onDelete: 'CASCADE',
    }));
    expect(qi.changeColumn).toHaveBeenCalledWith('knowledge_assets', 'knowledge_base_id', {
      type: 'UUID', allowNull: true,
    });
    expect(qi.sequelize.query.mock.calls[0][0]).toContain('knowledge_assets_single_owner_check');
  });

  test('supprime les sources incompatibles avant de restaurer la contrainte historique', async () => {
    const qi = queryInterface();
    await migration.down(qi, { UUID: 'UUID' });
    expect(qi.sequelize.query.mock.calls[1][0]).toContain(
      'DELETE FROM knowledge_assets WHERE knowledge_base_id IS NULL'
    );
    expect(qi.changeColumn).toHaveBeenCalledWith('knowledge_assets', 'knowledge_base_id', {
      type: 'UUID', allowNull: false,
    });
  });
});
