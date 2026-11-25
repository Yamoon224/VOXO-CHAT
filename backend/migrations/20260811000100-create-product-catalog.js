'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('knowledge_collections', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(255), allowNull: false },
      category: { type: Sequelize.STRING(150), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'User', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addColumn('KnowledgeBase', 'collection_id', { type: Sequelize.UUID, allowNull: true, references: { model: 'knowledge_collections', key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.addColumn('KnowledgeBase', 'item_type', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'knowledge' });
    await queryInterface.addColumn('KnowledgeBase', 'category', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'sku', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'price_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'price_currency', { type: Sequelize.STRING(3), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'price_mode', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'fixed' });
    await queryInterface.addColumn('KnowledgeBase', 'stock_status', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'unknown' });

    await queryInterface.createTable('knowledge_assets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      knowledge_base_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'KnowledgeBase', key: 'id' }, onDelete: 'CASCADE' },
      storage_key: { type: Sequelize.STRING(500), allowNull: false },
      original_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: { type: Sequelize.STRING(150), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER, allowNull: false },
      asset_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'image' },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('commercial_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Conversation', key: 'id' }, onDelete: 'CASCADE' },
      knowledge_base_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'KnowledgeBase', key: 'id' }, onDelete: 'SET NULL' },
      request_key: { type: Sequelize.STRING(255), allowNull: false },
      reason: { type: Sequelize.STRING(40), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      customer_name: { type: Sequelize.STRING(150), allowNull: false },
      customer_phone: { type: Sequelize.STRING(50), allowNull: false },
      customer_email: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'open' },
      notification_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      notified_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('knowledge_collections', ['tenant_id', 'status'], { name: 'knowledge_collections_tenant_status_idx' });
    await queryInterface.addIndex('knowledge_assets', ['tenant_id', 'knowledge_base_id'], { name: 'knowledge_assets_tenant_product_idx' });
    await queryInterface.addIndex('commercial_requests', ['tenant_id', 'request_key'], { unique: true, name: 'commercial_requests_tenant_key_unique' });
    await queryInterface.addIndex('KnowledgeBase', ['tenant_id', 'collection_id'], { name: 'knowledge_tenant_collection_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('commercial_requests');
    await queryInterface.dropTable('knowledge_assets');
    for (const column of ['stock_status', 'price_mode', 'price_currency', 'price_amount', 'sku', 'category', 'item_type', 'collection_id']) {
      await queryInterface.removeColumn('KnowledgeBase', column);
    }
    await queryInterface.dropTable('knowledge_collections');
  },
};
