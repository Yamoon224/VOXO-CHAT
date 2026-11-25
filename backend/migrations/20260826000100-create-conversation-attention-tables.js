'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversation_read_receipts', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Conversation', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
      last_read_at: { type: Sequelize.DATE, allowNull: false }, created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('conversation_read_receipts', ['tenant_id', 'user_id', 'conversation_id'], { unique: true, name: 'conversation_read_receipts_unique_idx' });
    await queryInterface.createTable('conversation_page_visits', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Conversation', key: 'id' }, onDelete: 'CASCADE' },
      message_id: { type: Sequelize.STRING(100), allowNull: false }, url: { type: Sequelize.STRING(2000), allowNull: false }, visited_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('conversation_page_visits', ['tenant_id', 'conversation_id', 'visited_at'], { name: 'conversation_page_visits_history_idx' });
    await queryInterface.addIndex('conversation_page_visits', ['tenant_id', 'conversation_id', 'message_id'], { unique: true, name: 'conversation_page_visits_message_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('conversation_page_visits'); await queryInterface.dropTable('conversation_read_receipts'); },
};
