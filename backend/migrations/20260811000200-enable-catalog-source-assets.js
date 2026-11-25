'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('knowledge_assets', 'collection_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'knowledge_collections', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.changeColumn('knowledge_assets', 'knowledge_base_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE knowledge_assets
      ADD CONSTRAINT knowledge_assets_single_owner_check
      CHECK (
        (knowledge_base_id IS NOT NULL AND collection_id IS NULL)
        OR (knowledge_base_id IS NULL AND collection_id IS NOT NULL)
      )
    `);
    await queryInterface.addIndex('knowledge_assets', ['tenant_id', 'collection_id'], {
      name: 'knowledge_assets_tenant_collection_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('knowledge_assets', 'knowledge_assets_tenant_collection_idx');
    await queryInterface.sequelize.query(`
      ALTER TABLE knowledge_assets
      DROP CONSTRAINT IF EXISTS knowledge_assets_single_owner_check
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM knowledge_assets WHERE knowledge_base_id IS NULL
    `);
    await queryInterface.removeColumn('knowledge_assets', 'collection_id');
    await queryInterface.changeColumn('knowledge_assets', 'knowledge_base_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
