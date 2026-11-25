'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('agent_turn_usage', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4 },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'Conversation', key: 'id' }, onDelete: 'SET NULL' },
      tokens_used: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estimated_tokens: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      llm_calls: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      tool_calls: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      stop_reason: { type: Sequelize.STRING(40), allowNull: false },
      correction_skipped: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('agent_turn_usage', ['tenant_id', 'created_at'], { name: 'agent_turn_usage_tenant_created_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('agent_turn_usage'); },
};
