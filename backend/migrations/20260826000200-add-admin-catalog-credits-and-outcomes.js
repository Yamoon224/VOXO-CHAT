'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('ALTER TABLE "Tenant" ALTER COLUMN subscription_plan TYPE VARCHAR(40) USING subscription_plan::text');
    await queryInterface.addColumn('plans', 'billing_interval', { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'monthly' });
    await queryInterface.addColumn('plans', 'credits_per_cycle', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('plans', 'allow_visitor_attachments', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addColumn('plans', 'allow_agent_attachments', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await queryInterface.addColumn('plans', 'is_archived', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('commercial_requests', 'category', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'other' });
    await queryInterface.addColumn('commercial_requests', 'outcome_status', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'open' });
    await queryInterface.addColumn('commercial_requests', 'resolved_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('commercial_requests', 'resolution_reason', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('commercial_requests', 'amount', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addIndex('commercial_requests', ['tenant_id', 'outcome_status'], { name: 'commercial_requests_tenant_outcome_idx' });
    await queryInterface.createTable('credit_ledger', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true }, tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      amount: { type: Sequelize.INTEGER, allowNull: false }, type: { type: Sequelize.STRING(20), allowNull: false }, period_key: { type: Sequelize.STRING(7), allowNull: true }, note: { type: Sequelize.STRING(250), allowNull: true }, created_by_admin_id: { type: Sequelize.UUID, allowNull: true }, created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }, updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('credit_ledger', ['tenant_id', 'created_at'], { name: 'credit_ledger_tenant_created_idx' });
    await queryInterface.addIndex('credit_ledger', ['tenant_id', 'period_key', 'type'], { unique: true, name: 'credit_ledger_cycle_unique_idx', where: { type: 'cycle_grant' } });
  },
  async down(queryInterface) { await queryInterface.dropTable('credit_ledger'); },
};
