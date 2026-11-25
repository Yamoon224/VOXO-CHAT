'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Conversation', 'handoff_status', {
      type: Sequelize.STRING(24), allowNull: false, defaultValue: 'ai',
    });
    await queryInterface.addColumn('Conversation', 'handoff_reason', { type: Sequelize.STRING(24), allowNull: true });
    await queryInterface.addColumn('Conversation', 'assigned_agent_id', {
      type: Sequelize.UUID, allowNull: true, references: { model: 'User', key: 'id' }, onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('Conversation', 'handoff_requested_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('Conversation', 'human_taken_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.createTable('conversation_alerts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Conversation', key: 'id' }, onDelete: 'CASCADE' },
      reason: { type: Sequelize.STRING(24), allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'open' },
      email_status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'pending' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('Conversation', ['tenant_id', 'handoff_status', 'updated_at'], { name: 'conversation_handoff_inbox_idx' });
    await queryInterface.addIndex('conversation_alerts', ['tenant_id', 'conversation_id', 'status'], { name: 'conversation_alert_open_idx' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('conversation_alerts');
    for (const column of ['human_taken_at', 'handoff_requested_at', 'assigned_agent_id', 'handoff_reason', 'handoff_status']) await queryInterface.removeColumn('Conversation', column);
  },
};
