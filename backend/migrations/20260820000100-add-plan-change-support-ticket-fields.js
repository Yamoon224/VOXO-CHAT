'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('support_tickets', 'type', {
      type: Sequelize.STRING(20), allowNull: false, defaultValue: 'general',
    });
    await queryInterface.addColumn('support_tickets', 'requested_plan', {
      type: Sequelize.STRING(20), allowNull: true,
    });
    await queryInterface.addColumn('support_tickets', 'request_note', {
      type: Sequelize.TEXT, allowNull: true,
    });
    await queryInterface.addIndex('support_tickets', ['tenant_id', 'type', 'status'], {
      unique: true,
      where: { type: 'plan_change', status: ['open', 'pending'] },
      name: 'support_tickets_plan_change_active_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('support_tickets', 'support_tickets_plan_change_active_idx');
    await queryInterface.removeColumn('support_tickets', 'request_note');
    await queryInterface.removeColumn('support_tickets', 'requested_plan');
    await queryInterface.removeColumn('support_tickets', 'type');
  },
};
